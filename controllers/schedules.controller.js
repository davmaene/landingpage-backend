// controllers/schedules.controller.js
const { Schedule, Faculty, Filiere, User } = require('../models');
const { Response } = require('../utils/Response');

const includes = [
  { model: Faculty, as: 'faculty', attributes: ['id', 'name', 'slug'] },
  { model: Filiere, as: 'filiere', attributes: ['id', 'name', 'slug'] },
  { model: User, as: 'author', attributes: ['id', 'name', 'email'] },
];

exports.list = async (req, res) => {
  try {
    const { type, facultyId, promotion, academicYear } = req.query;
    const where = { status: 'published' };
    if (type) where.type = type;
    if (facultyId) where.facultyId = facultyId;
    if (promotion) where.promotion = promotion;
    if (academicYear) where.academicYear = academicYear;
    const items = await Schedule.findAll({ where, include: includes, order: [['startDate', 'DESC'], ['createdAt', 'DESC']] });
    return Response(res, 200, { length: items.length, rows: items });
  } catch (e) {
    console.error(e);
    return Response(res, 500, { reason: e.message });
  }
};

exports.adminList = async (req, res) => {
  const where = {};
  if (req.query.status) where.status = req.query.status;
  if (req.user.role === 'faculty_publisher') where.authorId = req.user.id;
  const items = await Schedule.findAll({ where, include: includes, order: [['createdAt', 'DESC']] });
  return Response(res, 200, { length: items.length, rows: items });
};

exports.create = async (req, res) => {
  try {
    const { type, title, facultyId, filiereId, promotion, academicYear, semester, startDate, endDate, location, fileUrl, description } = req.body;
    if (!type || !title || !promotion) return Response(res, 401, { reason: 'Champs requis manquants' });
    if (!['cours', 'examen'].includes(type)) return Response(res, 405, { reason: 'Type invalide' });
    const facId = req.user.role === 'faculty_publisher' ? req.user.facultyId : facultyId;
    if (!facId) return Response(res, 401, { reason: 'Faculté requise' });
    const status = req.user.role === 'super_admin' ? 'published' : 'pending';
    const publishedAt = status === 'published' ? new Date() : null;
    const item = await Schedule.create({
      type, title, facultyId: facId, filiereId: filiereId || null, promotion, academicYear, semester,
      startDate: startDate || null, endDate: endDate || null, location, fileUrl, description,
      authorId: req.user.id, status, publishedAt,
    });
    return Response(res, 201, { item });
  } catch (e) {
    console.error(e);
    return Response(res, 500, { reason: e.message });
  }
};

exports.update = async (req, res) => {
  const item = await Schedule.findByPk(req.params.id);
  if (!item) return Response(res, 404, {});
  if (req.user.role !== 'super_admin' && item.authorId !== req.user.id) return Response(res, 403, {});
  ['title', 'filiereId', 'promotion', 'academicYear', 'semester', 'startDate', 'endDate', 'location', 'fileUrl', 'description']
    .forEach((f) => { if (req.body[f] !== undefined) item[f] = req.body[f]; });
  if (req.user.role === 'faculty_publisher') { item.status = 'pending'; item.publishedAt = null; }
  await item.save();
  return Response(res, 200, { item });
};

exports.approve = async (req, res) => {
  const item = await Schedule.findByPk(req.params.id);
  if (!item) return Response(res, 404, {});
  item.status = 'published'; item.publishedAt = new Date(); item.rejectionReason = null;
  await item.save();
  return Response(res, 200, { item });
};

exports.reject = async (req, res) => {
  const item = await Schedule.findByPk(req.params.id);
  if (!item) return Response(res, 404, {});
  item.status = 'rejected'; item.rejectionReason = req.body.reason || 'Refusé';
  await item.save();
  return Response(res, 200, { item });
};

exports.remove = async (req, res) => {
  const item = await Schedule.findByPk(req.params.id);
  if (!item) return Response(res, 404, {});
  if (req.user.role !== 'super_admin' && item.authorId !== req.user.id) return Response(res, 403, {});
  await item.destroy();
  return Response(res, 200, { deleted: true });
};
