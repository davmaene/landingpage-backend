// controllers/auth.controller.js
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { User, Faculty, Center, StaffMember, PasswordResetToken, LoginHistory } = require('../models');
const { sign } = require('../middleware/auth.middleware');
const { sendMail } = require('../utils/mailer');
const { Response } = require('../utils/Response');

/** Extrait l'IP réelle même derrière un reverse-proxy */
const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.ip || req.connection?.remoteAddress || null;
};

/** Enregistre silencieusement une tentative — ne bloque jamais la réponse */
const recordLogin = (data) => {
  LoginHistory.create(data).catch((err) =>
    console.warn('[LoginHistory] write error:', err.message)
  );
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const ip        = getClientIp(req);
    const userAgent = req.headers['user-agent'] || null;
    const emailNorm = String(email || '').toLowerCase().trim();

    if (!email || !password) return Response(res, 401, { reason: 'Email et mot de passe requis' });

    const user = await User.findOne({
      where: { email: emailNorm },
      include: [
        { model: Faculty, as: 'faculty' },
        { model: Center, as: 'center', attributes: ['id', 'title', 'slug'] },
      ],
    });

    if (!user) {
      recordLogin({ email: emailNorm, status: 'failed', failReason: 'unknown_email', ip, userAgent });
      return Response(res, 403, {});
    }

    if (!user.isActive) {
      recordLogin({ userId: user.id, email: emailNorm, status: 'disabled', failReason: 'account_disabled', ip, userAgent });
      return Response(res, 244, {});
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      recordLogin({ userId: user.id, email: emailNorm, status: 'failed', failReason: 'bad_credentials', ip, userAgent });
      return Response(res, 403, {});
    }

    recordLogin({ userId: user.id, email: emailNorm, status: 'success', ip, userAgent });
    const token = sign(user);
    const safeUser = user.toJSON();
    delete safeUser.password;
    return Response(res, 200, { token, user: safeUser });
  } catch (e) {
    console.error(e);
    return Response(res, 500, { reason: e.message });
  }
};

exports.me = async (req, res) => {
  return Response(res, 200, { user: req.user });
};

exports.register = async (req, res) => {
  if (req.user.role !== 'super_admin')
    return Response(res, 403, { reason: 'Seul un super admin peut créer un compte' });
  try {
    const { name, email, password, role, facultyId, centerId, staffId } = req.body;
    if (!name || !email || !password) return Response(res, 401, { reason: 'Champs requis manquants' });

    let resolvedRole = 'faculty_publisher';
    if (role === 'super_admin') resolvedRole = 'super_admin';
    else if (role === 'center_publisher') resolvedRole = 'center_publisher';

    if (resolvedRole === 'faculty_publisher' && !facultyId)
      return Response(res, 401, { reason: 'Une faculté est requise pour un publieur faculté' });
    if (resolvedRole === 'center_publisher' && !centerId)
      return Response(res, 401, { reason: 'Un centre est requis pour un publieur centre' });

    const exists = await User.findOne({ where: { email: email.toLowerCase().trim() } });
    if (exists) return Response(res, 405, { reason: 'Email déjà utilisé' });

    let resolvedName = String(name).trim();
    let resolvedEmail = email.toLowerCase().trim();
    if (staffId) {
      const member = await StaffMember.findByPk(staffId);
      if (!member) return Response(res, 404, { reason: 'Membre du personnel introuvable' });
      if (!resolvedName) resolvedName = member.name;
      const staffEmails = Array.isArray(member.email)
        ? member.email
        : (typeof member.email === 'string' ? (() => { try { return JSON.parse(member.email); } catch { return []; } })() : []);
      if (staffEmails.length && !email) resolvedEmail = String(staffEmails[0]).toLowerCase().trim();
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: resolvedName,
      email: resolvedEmail,
      password: hashed,
      role: resolvedRole,
      facultyId: resolvedRole === 'faculty_publisher' ? facultyId : null,
      centerId: resolvedRole === 'center_publisher' ? centerId : null,
      staffId: staffId || null,
    });
    const safe = user.toJSON();
    delete safe.password;
    return Response(res, 201, { user: safe });
  } catch (e) {
    console.error(e);
    return Response(res, 500, { reason: e.message });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const email = String(req.body.email || '').toLowerCase().trim();
    if (!email) return Response(res, 401, { reason: 'Email requis' });
    const user = await User.findOne({ where: { email } });
    if (!user) return Response(res, 200, { sent: true });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await PasswordResetToken.create({ userId: user.id, token, expiresAt });

    const frontendBase =
      process.env.FRONTEND_URL && process.env.FRONTEND_URL !== '*'
        ? process.env.FRONTEND_URL
        : req.headers.origin || '';
    const resetLink = `${frontendBase}/reset-password?token=${token}`;

    const mailResult = await sendMail({
      to: user.email,
      subject: 'Réinitialisation de votre mot de passe — ULPGL',
      html: `<p>Bonjour ${user.name},</p>
        <p>Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le lien ci-dessous (valable 1 heure) :</p>
        <p><a href="${resetLink}">${resetLink}</a></p>`,
    });

    if (mailResult.skipped) console.log(`[DEV] Password reset link for ${email}: ${resetLink}`);

    return Response(res, 200, {
      sent: true,
      devLink: mailResult.skipped ? resetLink : undefined,
    });
  } catch (e) {
    console.error(e);
    return Response(res, 500, { reason: e.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return Response(res, 401, { reason: 'Token et mot de passe requis' });
    if (password.length < 6) return Response(res, 405, { reason: 'Mot de passe trop court (min 6)' });

    const record = await PasswordResetToken.findOne({
      where: { token, usedAt: null, expiresAt: { [Op.gt]: new Date() } },
    });
    if (!record) return Response(res, 400, { reason: 'Lien invalide ou expiré' });

    const user = await User.findByPk(record.userId);
    if (!user) return Response(res, 404, { reason: 'Compte introuvable' });

    user.password = await bcrypt.hash(password, 10);
    await user.save();
    record.usedAt = new Date();
    await record.save();

    return Response(res, 200, { updated: true });
  } catch (e) {
    console.error(e);
    return Response(res, 500, { reason: e.message });
  }
};
