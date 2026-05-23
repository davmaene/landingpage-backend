// controllers/centers.controller.js
const slugify = require('slugify');
const { Center, Faculty, User, serializeCenter, deserializeCenter } = require('../models');
const { Response } = require('../utils/Response');

const includes = [
  { model: Faculty, as: 'faculty', attributes: ['id', 'name', 'slug'] },
  { model: User, as: 'author', attributes: ['id', 'name', 'email'] },
];

const mapItems = (rows) => rows.map((r) => deserializeCenter(r));

exports.list = async (req, res) => {
  const where = { status: 'published' };
  if (req.query.facultyId) where.facultyId = req.query.facultyId;
  const items = await Center.findAll({ where, include: includes, order: [['title', 'ASC']] });
  const rows = mapItems(items);
  return Response(res, 200, { length: rows.length, rows });
};

exports.getBySlug = async (req, res) => {
  const item = await Center.findOne({ where: { slug: req.params.slug, status: 'published' }, include: includes });
  if (!item) return Response(res, 404, {});
  return Response(res, 200, { item: deserializeCenter(item) });
};

exports.adminList = async (req, res) => {
  const where = {};
  if (req.query.status) where.status = req.query.status;
  if (req.user.role === 'faculty_publisher') where.authorId = req.user.id;
  const items = await Center.findAll({ where, include: includes, order: [['createdAt', 'DESC']] });
  const rows = mapItems(items);
  return Response(res, 200, { length: rows.length, rows });
};

exports.create = async (req, res) => {
  try {
    const { title, description, profile, coverImage, images, direction,
            domaineInterventions, etudesRealisees, partenaires, contacts, facultyId } = req.body;
    if (!title?.trim() || !description?.trim()) return Response(res, 401, { reason: 'Titre et description requis' });

    let slug = slugify(title, { lower: true, strict: true });
    const existing = await Center.findOne({ where: { slug } });
    if (existing) slug = `${slug}-${Date.now()}`;

    const status = req.user.role === 'super_admin' ? 'published' : 'pending';
    const publishedAt = status === 'published' ? new Date() : null;

    const payload = serializeCenter({
      slug, title, description, profile, coverImage,
      images: Array.isArray(images) ? images : [],
      direction: direction || null,
      domaineInterventions: Array.isArray(domaineInterventions) ? domaineInterventions : [],
      etudesRealisees: Array.isArray(etudesRealisees) ? etudesRealisees : [],
      partenaires: Array.isArray(partenaires) ? partenaires : [],
      contacts: Array.isArray(contacts) ? contacts : [],
      facultyId: req.user.role === 'faculty_publisher' ? req.user.facultyId : (facultyId || null),
      authorId: req.user.id, status, publishedAt,
    });
    const item = await Center.create(payload);
    return Response(res, 201, { item: deserializeCenter(item) });
  } catch (e) {
    console.error(e);
    return Response(res, 500, { reason: e.message });
  }
};

exports.update = async (req, res) => {
  const item = await Center.findByPk(req.params.id);
  if (!item) return Response(res, 404, {});
  if (req.user.role !== 'super_admin' && item.authorId !== req.user.id) return Response(res, 403, {});

  ['title', 'description', 'profile', 'coverImage'].forEach((f) => {
    if (req.body[f] !== undefined) item[f] = req.body[f];
  });
  ['images', 'direction', 'domaineInterventions', 'etudesRealisees', 'partenaires', 'contacts'].forEach((f) => {
    if (req.body[f] !== undefined) item[f] = JSON.stringify(req.body[f]);
  });
  if (req.body.title) item.slug = slugify(req.body.title, { lower: true, strict: true }) + '-' + item.id;
  if (req.user.role === 'faculty_publisher') { item.status = 'pending'; item.publishedAt = null; }
  await item.save();
  return Response(res, 200, { item: deserializeCenter(item) });
};

exports.approve = async (req, res) => {
  const item = await Center.findByPk(req.params.id);
  if (!item) return Response(res, 404, {});
  item.status = 'published'; item.publishedAt = new Date(); item.rejectionReason = null;
  await item.save();
  return Response(res, 200, { item: deserializeCenter(item) });
};

exports.reject = async (req, res) => {
  const item = await Center.findByPk(req.params.id);
  if (!item) return Response(res, 404, {});
  item.status = 'rejected'; item.rejectionReason = req.body.reason || 'Refusé';
  await item.save();
  return Response(res, 200, { item: deserializeCenter(item) });
};

exports.remove = async (req, res) => {
  const item = await Center.findByPk(req.params.id);
  if (!item) return Response(res, 404, {});
  if (req.user.role !== 'super_admin' && item.authorId !== req.user.id) return Response(res, 403, {});
  await item.destroy();
  return Response(res, 200, { deleted: true });
};
