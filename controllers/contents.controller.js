// controllers/contents.controller.js
const slugify = require('slugify');
const { Op } = require('sequelize');
const { Content, User, Faculty } = require('../models');
const { Response } = require('../utils/Response');

const authorIncludes = [
  { model: User, as: 'author', attributes: ['id', 'name', 'email', 'role'] },
  { model: Faculty, as: 'faculty', attributes: ['id', 'name', 'slug'] },
];

exports.list = async (req, res) => {
  try {
    const { type, limit = 50, status = 'published', facultyId } = req.query;
    const where = { status };
    if (type) where.type = type;
    if (facultyId) where.facultyId = facultyId;
    const items = await Content.findAll({
      where,
      include: authorIncludes,
      order: [['publishedAt', 'DESC'], ['createdAt', 'DESC']],
      limit: Math.min(parseInt(limit, 10) || 50, 200),
    });
    return Response(res, 200, { length: items.length, rows: items });
  } catch (e) {
    console.error(e);
    return Response(res, 500, { reason: e.message });
  }
};

exports.getBySlug = async (req, res) => {
  try {
    const item = await Content.findOne({
      where: { slug: req.params.slug, status: 'published' },
      include: authorIncludes,
    });
    if (!item) return Response(res, 404, {});
    item.views = (item.views || 0) + 1;
    await item.save();
    return Response(res, 200, { item });
  } catch (e) {
    return Response(res, 500, { reason: e.message });
  }
};

exports.adminList = async (req, res) => {
  const where = {};
  if (req.query.status) where.status = req.query.status;
  if (req.user.role === 'faculty_publisher') where.authorId = req.user.id;
  const items = await Content.findAll({ where, include: authorIncludes, order: [['createdAt', 'DESC']] });
  return Response(res, 200, { length: items.length, rows: items });
};

exports.create = async (req, res) => {
  try {
    const { type, title, excerpt, content, category, coverImage, eventDate, location } = req.body;
    if (!type || !title || !content) return Response(res, 401, { reason: 'Champs requis manquants' });
    if (!['article', 'event', 'activity'].includes(type))
      return Response(res, 405, { reason: 'Type invalide' });

    let slug = slugify(title, { lower: true, strict: true });
    const exists = await Content.findOne({ where: { slug } });
    if (exists) slug = `${slug}-${Date.now()}`;

    const facultyId =
      req.user.role === 'faculty_publisher' ? req.user.facultyId : req.body.facultyId || null;
    const status = req.user.role === 'super_admin' ? 'published' : 'pending';
    const publishedAt = status === 'published' ? new Date() : null;

    const item = await Content.create({
      type, title, slug, excerpt, content, category, coverImage,
      eventDate: eventDate || null, location,
      authorId: req.user.id, facultyId, status, publishedAt,
    });
    return Response(res, 201, { item });
  } catch (e) {
    console.error(e);
    return Response(res, 500, { reason: e.message });
  }
};

exports.update = async (req, res) => {
  const item = await Content.findByPk(req.params.id);
  if (!item) return Response(res, 404, {});
  if (req.user.role !== 'super_admin' && item.authorId !== req.user.id)
    return Response(res, 403, {});
  const { title, excerpt, content, category, coverImage, eventDate, location } = req.body;
  if (title && title !== item.title) {
    item.title = title;
    item.slug = slugify(title, { lower: true, strict: true }) + '-' + item.id;
  }
  if (excerpt !== undefined) item.excerpt = excerpt;
  if (content !== undefined) item.content = content;
  if (category !== undefined) item.category = category;
  if (coverImage !== undefined) item.coverImage = coverImage;
  if (eventDate !== undefined) item.eventDate = eventDate;
  if (location !== undefined) item.location = location;
  if (req.user.role === 'faculty_publisher') {
    item.status = 'pending';
    item.publishedAt = null;
  }
  await item.save();
  return Response(res, 200, { item });
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
