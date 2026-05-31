// controllers/loginHistory.controller.js
const { Op } = require('sequelize');
const { LoginHistory, User } = require('../models');
const { Response } = require('../utils/Response');

// Durée de rétention : 24 heures
const RETENTION_HOURS = 24;

// ─── GET /api/auth/history  (super_admin) ────────────────────────────────────
exports.getHistory = async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const where = {};
    if (req.query.userId) where.userId = parseInt(req.query.userId);
    if (req.query.status && ['success', 'failed', 'disabled'].includes(req.query.status)) {
      where.status = req.query.status;
    }
    if (req.query.from || req.query.to) {
      where.createdAt = {};
      if (req.query.from) where.createdAt[Op.gte] = new Date(req.query.from);
      if (req.query.to)   where.createdAt[Op.lte] = new Date(req.query.to);
    }

    const { count, rows } = await LoginHistory.findAndCountAll({
      where,
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'role'],
        required: false,
      }],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    return Response(res, 200, {
      total: count,
      page,
      limit,
      pages: Math.ceil(count / limit),
      rows,
    });
  } catch (e) {
    console.error(e);
    return Response(res, 500, { reason: e.message });
  }
};

// ─── GET /api/auth/history/me  (utilisateur connecté) ────────────────────────
exports.getMyHistory = async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const offset = (page - 1) * limit;

    const { count, rows } = await LoginHistory.findAndCountAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    return Response(res, 200, {
      total: count,
      page,
      limit,
      pages: Math.ceil(count / limit),
      rows,
    });
  } catch (e) {
    console.error(e);
    return Response(res, 500, { reason: e.message });
  }
};

// ─── DELETE /api/auth/history/purge  (super_admin) ───────────────────────────
exports.purgeOld = async (req, res) => {
  try {
    const cutoff = new Date(Date.now() - RETENTION_HOURS * 60 * 60 * 1000);
    const deleted = await LoginHistory.destroy({
      where: { createdAt: { [Op.lt]: cutoff } },
    });
    return Response(res, 200, { deleted, retentionHours: RETENTION_HOURS, cutoff });
  } catch (e) {
    console.error(e);
    return Response(res, 500, { reason: e.message });
  }
};
