// controllers/misc.controller.js — Faculties, Search, Newsletter, Contact, Dashboard, Users
const { Op } = require('sequelize');
const { Faculty, Filiere, Content, Newsletter, ContactMessage, User, Schedule } = require('../models');
const { sendMail } = require('../utils/mailer');
const { Response } = require('../utils/Response');

// ---------------- Faculties ----------------
exports.listFaculties = async (req, res) => {
  const items = await Faculty.findAll({ include: [{ model: Filiere, as: 'filieres' }], order: [['name', 'ASC']] });
  return Response(res, 200, { length: items.length, rows: items });
};

exports.getFaculty = async (req, res) => {
  const item = await Faculty.findOne({ where: { slug: req.params.slug }, include: [{ model: Filiere, as: 'filieres' }] });
  if (!item) return Response(res, 404, {});
  return Response(res, 200, { item });
};

exports.getFiliere = async (req, res) => {
  const faculty = await Faculty.findOne({ where: { slug: req.params.slug } });
  if (!faculty) return Response(res, 404, { reason: 'Faculté introuvable' });
  const filiere = await Filiere.findOne({ where: { facultyId: faculty.id, slug: req.params.filiereSlug } });
  if (!filiere) return Response(res, 404, { reason: 'Filière introuvable' });
  return Response(res, 200, { faculty, filiere });
};

// ---------------- Search ----------------
exports.search = async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return Response(res, 200, { q: '', contents: [], faculties: [], filieres: [] });
  const like = { [Op.like]: `%${q}%` };
  const [contents, faculties, filieres] = await Promise.all([
    Content.findAll({
      where: { status: 'published', [Op.or]: [{ title: like }, { excerpt: like }, { content: like }, { category: like }] },
      limit: 20, order: [['publishedAt', 'DESC']],
    }),
    Faculty.findAll({ where: { [Op.or]: [{ name: like }, { domaine: like }, { description: like }] }, limit: 10 }),
    Filiere.findAll({
      where: { [Op.or]: [{ name: like }, { description: like }] },
      include: [{ model: Faculty, as: 'faculty' }], limit: 10,
    }),
  ]);
  return Response(res, 200, { q, contents, faculties, filieres });
};

// ---------------- Newsletter ----------------
exports.subscribe = async (req, res) => {
  try {
    const email = String(req.body.email || '').toLowerCase().trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return Response(res, 405, { reason: 'Email invalide' });
    const [, created] = await Newsletter.findOrCreate({ where: { email } });
    if (created) {
      sendMail({
        to: email,
        subject: "Bienvenue à la newsletter de l'ULPGL",
        html: `<p>Merci pour votre inscription à la newsletter de l'ULPGL-Goma.</p>`,
      });
    }
    return Response(res, 200, { subscribed: true, alreadyExists: !created });
  } catch (e) {
    return Response(res, 500, { reason: e.message });
  }
};

exports.listNewsletter = async (req, res) => {
  const items = await Newsletter.findAll({ order: [['createdAt', 'DESC']] });
  return Response(res, 200, { length: items.length, rows: items });
};

// ---------------- Contact ----------------
exports.sendContact = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !subject || !message)
      return Response(res, 401, { reason: 'Tous les champs sont requis' });
    const item = await ContactMessage.create({
      name: String(name).trim(),
      email: String(email).toLowerCase().trim(),
      subject: String(subject).trim(),
      message: String(message).trim(),
    });
    sendMail({
      to: process.env.ADMIN_EMAIL,
      subject: `Nouveau message: ${subject}`,
      html: `<h3>Message reçu via le site ULPGL</h3>
        <p><b>De :</b> ${name} &lt;${email}&gt;</p>
        <p><b>Objet :</b> ${subject}</p>
        <p>${message.replace(/\n/g, '<br>')}</p>`,
    });
    return Response(res, 201, { id: item.id });
  } catch (e) {
    return Response(res, 500, { reason: e.message });
  }
};

exports.listContact = async (req, res) => {
  const items = await ContactMessage.findAll({ order: [['createdAt', 'DESC']] });
  return Response(res, 200, { length: items.length, rows: items });
};

exports.deleteContact = async (req, res) => {
  await ContactMessage.destroy({ where: { id: req.params.id } });
  return Response(res, 200, { deleted: true });
};

// ---------------- Dashboard ----------------
exports.stats = async (req, res) => {
  const isAdmin = req.user.role === 'super_admin';
  const whereAuthor = isAdmin ? {} : { authorId: req.user.id };
  const [total, pending, published, rejected, newsletters, messages, schedulesTotal, schedulesPending] = await Promise.all([
    Content.count({ where: whereAuthor }),
    Content.count({ where: { ...whereAuthor, status: 'pending' } }),
    Content.count({ where: { ...whereAuthor, status: 'published' } }),
    Content.count({ where: { ...whereAuthor, status: 'rejected' } }),
    isAdmin ? Newsletter.count() : Promise.resolve(0),
    isAdmin ? ContactMessage.count({ where: { isRead: false } }) : Promise.resolve(0),
    Schedule.count({ where: whereAuthor }),
    Schedule.count({ where: { ...whereAuthor, status: 'pending' } }),
  ]);
  return Response(res, 200, { total, pending, published, rejected, newsletters, messages, schedulesTotal, schedulesPending });
};

// ---------------- Users ----------------
exports.listUsers = async (req, res) => {
  const items = await User.findAll({
    attributes: { exclude: ['password'] },
    include: [{ model: Faculty, as: 'faculty' }],
    order: [['createdAt', 'DESC']],
  });
  return Response(res, 200, { length: items.length, rows: items });
};

exports.updateUser = async (req, res) => {
  const u = await User.findByPk(req.params.id);
  if (!u) return Response(res, 404, {});
  const { name, role, facultyId, isActive } = req.body;
  if (name !== undefined) u.name = name;
  if (role !== undefined) u.role = role;
  if (facultyId !== undefined) u.facultyId = facultyId || null;
  if (isActive !== undefined) u.isActive = isActive;
  await u.save();
  const safe = u.toJSON();
  delete safe.password;
  return Response(res, 200, { user: safe });
};
