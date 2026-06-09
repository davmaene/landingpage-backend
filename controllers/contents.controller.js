const slugify = require('slugify');
const { Op } = require('sequelize');
const { Content, User, Faculty, Center, Filiere, SpecialProgram, Newsletter } = require('../models');
const { Response } = require('../utils/Response');
const { sendMail, isConfigured } = require('../utils/mailer');
const { publicationBroadcastTemplate } = require('../utils/emailTemplates');
const { isSocialBot, generateOgHtml, parseGallery, stringifyGallery } = require('../utils/helpers');
const path = require("path");

const ALLOWED_ATTACHMENT_TYPES = ['youtube', 'video', 'pdf'];
const ALLOWED_ATTACHMENT_LAYOUTS = ['portrait', 'landscape', 'auto'];

const normalizeAttachment = (body) => {
  const type = body.attachmentType;
  const url = typeof body.attachmentUrl === 'string' ? body.attachmentUrl.trim() : '';
  const layout = ALLOWED_ATTACHMENT_LAYOUTS.includes(body.attachmentLayout)
    ? body.attachmentLayout
    : 'auto';
  if (!type || !url) {
    return { attachmentType: null, attachmentUrl: null, attachmentLayout: 'auto' };
  }
  if (!ALLOWED_ATTACHMENT_TYPES.includes(type)) {
    return { error: 'Type de pièce jointe invalide' };
  }
  if (!/^https?:\/\//i.test(url)) {
    return { error: 'URL de pièce jointe invalide' };
  }
  return { attachmentType: type, attachmentUrl: url, attachmentLayout: layout };
};

const mapContentRow = (row) => {
  const obj = row?.toJSON ? row.toJSON() : { ...row };
  obj.galleryImages = parseGallery(obj.galleryImages);
  if (!obj.attachmentType) {
    obj.attachmentType = null;
    obj.attachmentUrl = null;
  }
  return obj;
};

const authorIncludes = [
  { model: User, as: 'author', attributes: ['id', 'name', 'email', 'role'] },
  { model: Faculty, as: 'faculty', attributes: ['id', 'name', 'slug'] },
  { model: Center, as: 'center', attributes: ['id', 'title', 'slug'] },
  { model: Filiere, as: 'filiere', attributes: ['id', 'name', 'slug'] },
  { model: SpecialProgram, as: 'specialProgram', attributes: ['id', 'name', 'slug'] },
];

exports.list = async (req, res) => {
  try {
    const { type, limit = 50, status = 'published', facultyId, centerId, filiereId, specialProgramId } = req.query;
    const where = { status };
    if (type) where.type = type;
    if (facultyId) where.facultyId = facultyId;
    if (centerId) where.centerId = centerId;
    if (filiereId) where.filiereId = filiereId;
    if (specialProgramId) where.specialProgramId = specialProgramId;
    const items = await Content.findAll({
      where,
      include: authorIncludes,
      order: [['publishedAt', 'DESC'], ['createdAt', 'DESC']],
      limit: Math.min(parseInt(limit, 10) || 50, 200),
    });
    const rows = items.map(mapContentRow);
    return Response(res, 200, { length: rows.length, rows });
  } catch (e) {
    console.error(e);
    return Response(res, 500, { reason: e.message });
  }
};

exports.getBySlugOnlyForBot = async (req, res) => {
  try {
    const slug = req.params.slug;
    const userAgent = req.headers['user-agent'] || '';

    const item = await Content.findOne({
      where: { slug, status: 'published' },
      include: authorIncludes,
    });
    
    if (!item) {
      return res.status(404).send('Article non trouvé');
    }

    if (isSocialBot(userAgent)) {
      const html = generateOgHtml(item, req);
      return res.status(200).send(html);
    }

    const indexPath = path.join(__dirname, '..', 'build', 'index.html');
    res.sendFile(indexPath);
  } catch (error) {
    console.error(error);
    res.status(500).send('Erreur serveur');
  }
}

exports.getBySlug = async (req, res) => {
  try {
    const item = await Content.findOne({
      where: { slug: req.params.slug, status: 'published' },
      include: authorIncludes,
    });
    if (!item) return Response(res, 404, {});
    item.views = (item.views || 0) + 1;
    await item.save();
    return Response(res, 200, { item: mapContentRow(item) });
  } catch (e) {
    return Response(res, 500, { reason: e.message });
  }
};

exports.adminList = async (req, res) => {
  const where = {};
  if (req.query.status) where.status = req.query.status;
  if (req.user.role === 'faculty_publisher') where.authorId = req.user.id;
  if (req.user.role === 'center_publisher') where.authorId = req.user.id;
  const items = await Content.findAll({ where, include: authorIncludes, order: [['createdAt', 'DESC']] });
  const rows = items.map(mapContentRow);
  return Response(res, 200, { length: rows.length, rows });
};

exports.create = async (req, res) => {
  try {
    const {
      type, title, excerpt, content, category, coverImage, galleryImages,
      eventDate, location, filiereId, specialProgramId,
      attachmentType, attachmentUrl, attachmentLayout,
    } = req.body;
    if (!type || !title || !content) return Response(res, 401, { reason: 'Champs requis manquants' });
    const attachment = normalizeAttachment({ attachmentType, attachmentUrl, attachmentLayout });
    if (attachment.error) return Response(res, 405, { reason: attachment.error });
    if (!['article', 'event', 'activity'].includes(type))
      return Response(res, 405, { reason: 'Type invalide' });

    let slug = slugify(title, { lower: true, strict: true });
    const exists = await Content.findOne({ where: { slug } });
    if (exists) slug = `${slug}-${Date.now()}`;

    const facultyId =
      req.user.role === 'faculty_publisher' ? req.user.facultyId : req.body.facultyId || null;
    const centerId =
      req.user.role === 'center_publisher' ? req.user.centerId : req.body.centerId || null;
    const status = req.user.role === 'super_admin' ? 'published' : 'pending';
    const publishedAt = status === 'published' ? new Date() : null;

    const item = await Content.create({
      type, title, slug, excerpt, content, category, coverImage,
      galleryImages: stringifyGallery(galleryImages),
      attachmentType: attachment.attachmentType,
      attachmentUrl: attachment.attachmentUrl,
      attachmentLayout: attachment.attachmentLayout,
      eventDate: eventDate || null, location,
      authorId: req.user.id, facultyId, centerId, filiereId: filiereId || null,
      specialProgramId: specialProgramId || null, status, publishedAt,
    });
    return Response(res, 201, { item: mapContentRow(item) });
  } catch (e) {
    return Response(res, 500, { reason: e.message });
  }
};

exports.update = async (req, res) => {
  const item = await Content.findByPk(req.params.id);
  if (!item) return Response(res, 404, {});
  if (req.user.role !== 'super_admin' && item.authorId !== req.user.id)
    return Response(res, 403, {});
  const {
    title, excerpt, content, category, coverImage, galleryImages,
    eventDate, location, filiereId, specialProgramId,
    attachmentType, attachmentUrl, attachmentLayout,
  } = req.body;
  let attachment;
  if (attachmentType !== undefined || attachmentUrl !== undefined || attachmentLayout !== undefined) {
    const cleared = !attachmentType && !attachmentUrl;
    if (cleared) {
      attachment = { attachmentType: null, attachmentUrl: null, attachmentLayout: 'auto' };
    } else {
      attachment = normalizeAttachment({
        attachmentType: attachmentType ?? item.attachmentType,
        attachmentUrl: attachmentUrl ?? item.attachmentUrl,
        attachmentLayout: attachmentLayout ?? item.attachmentLayout,
      });
      if (attachment.error) return Response(res, 405, { reason: attachment.error });
    }
  }
  if (title && title !== item.title) {
    item.title = title;
    item.slug = slugify(title, { lower: true, strict: true }) + '-' + item.id;
  }
  if (excerpt !== undefined) item.excerpt = excerpt;
  if (content !== undefined) item.content = content;
  if (category !== undefined) item.category = category;
  if (coverImage !== undefined) item.coverImage = coverImage;
  if (galleryImages !== undefined) item.galleryImages = stringifyGallery(galleryImages);
  if (attachment) {
    item.attachmentType = attachment.attachmentType;
    item.attachmentUrl = attachment.attachmentUrl;
    item.attachmentLayout = attachment.attachmentLayout;
  }
  if (eventDate !== undefined) item.eventDate = eventDate;
  if (location !== undefined) item.location = location;
  if (filiereId !== undefined) item.filiereId = filiereId || null;
  if (specialProgramId !== undefined) item.specialProgramId = specialProgramId || null;
  if (req.user.role === 'faculty_publisher' || req.user.role === 'center_publisher') {
    item.status = 'pending';
    item.publishedAt = null;
  }
  await item.save();
  return Response(res, 200, { item: mapContentRow(item) });
};

exports.approve = async (req, res) => {
  const item = await Content.findByPk(req.params.id);
  if (!item) return Response(res, 404, {});
  item.status = 'published';
  item.publishedAt = new Date();
  item.rejectionReason = null;
  await item.save();
  return Response(res, 200, { item });
};

exports.reject = async (req, res) => {
  const item = await Content.findByPk(req.params.id);
  if (!item) return Response(res, 404, {});
  item.status = 'rejected';
  item.rejectionReason = req.body.reason || 'Refusé par administrateur';
  await item.save();
  return Response(res, 200, { item });
};

exports.remove = async (req, res) => {
  const item = await Content.findByPk(req.params.id);
  if (!item) return Response(res, 404, {});
  if (req.user.role !== 'super_admin' && item.authorId !== req.user.id)
    return Response(res, 403, {});
  await item.destroy();
  return Response(res, 200, { deleted: true });
};

// Diffuse une publication aux abonnés de la newsletter (tous ou sélection).
exports.broadcast = async (req, res) => {
  try {
    const item = await Content.findByPk(req.params.id, { include: authorIncludes });
    if (!item) return Response(res, 404, {});
    if (req.user.role !== 'super_admin' && item.authorId !== req.user.id)
      return Response(res, 403, {});

    const all = req.body.all === undefined ? true : !!req.body.all;
    const recipientIds = Array.isArray(req.body.recipientIds) ? req.body.recipientIds : [];

    const where = { isActive: true };
    if (!all) {
      if (!recipientIds.length) return Response(res, 401, { reason: 'Aucun destinataire sélectionné' });
      where.id = { [Op.in]: recipientIds };
    }
    const subs = await Newsletter.findAll({ where, attributes: ['id', 'email'] });
    const emails = [...new Set(subs.map((s) => s.email).filter(Boolean))];
    if (!emails.length) return Response(res, 200, { sent: 0, total: 0, reason: 'Aucun abonné' });

    const frontendUrl = process.env.FRONTEND_URL || 'https://ulpgl.net';
    const { subject, html, text } = publicationBroadcastTemplate({ content: item, frontendUrl });

    if (!isConfigured()) {
      return Response(res, 200, { sent: 0, total: emails.length, skipped: true, reason: 'SMTP non configuré (mode skip)' });
    }

    const chunkSize = 50;
    let sent = 0;
    const errors = [];
    for (let i = 0; i < emails.length; i += chunkSize) {
      const chunk = emails.slice(i, i + chunkSize);
      const r = await sendMail({ bcc: chunk, subject, html, text });
      if (r.sent) sent += chunk.length;
      else if (r.error) errors.push(r.error);
    }
    return Response(res, 200, { sent, total: emails.length, errors: errors.length ? errors : undefined });
  } catch (e) {
    console.error(e);
    return Response(res, 500, { reason: e.message });
  }
};
