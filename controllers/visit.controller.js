// controllers/visit.controller.js
const { fn, col, literal, Op } = require('sequelize');
const { SiteVisit, sequelize } = require('../models');
const { Response } = require('../utils/Response');

/** Extrait l'IP réelle même derrière un reverse-proxy */
const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.ip || req.connection?.remoteAddress || null;
};

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

// ─── POST /api/visits  (public) ──────────────────────────────────────────────
// Enregistre une visite. Ne bloque jamais : renvoie 200 même en cas d'erreur soft.
exports.recordVisit = async (req, res) => {
  try {
    const visitorId = String(req.body?.visitorId || '').trim().slice(0, 80);
    if (!visitorId) return Response(res, 401, { reason: 'visitorId requis' });

    const path = (req.body?.path ? String(req.body.path) : '/').slice(0, 255);
    const referrer = req.body?.referrer ? String(req.body.referrer).slice(0, 500) : null;

    await SiteVisit.create({
      visitorId,
      path,
      referrer,
      ip: getClientIp(req),
      userAgent: req.headers['user-agent'] || null,
    });

    return Response(res, 201, { recorded: true });
  } catch (e) {
    console.error('[Visit] record error:', e.message);
    return Response(res, 500, { reason: e.message });
  }
};

// ─── GET /api/visits/count  (public) ─────────────────────────────────────────
// Renvoie le total de visites et le nombre de visiteurs uniques (pour le footer).
exports.getCount = async (req, res) => {
  try {
    const [total, unique] = await Promise.all([
      SiteVisit.count(),
      SiteVisit.count({ distinct: true, col: 'visitorId' }),
    ]);
    return Response(res, 200, { total, unique });
  } catch (e) {
    console.error('[Visit] count error:', e.message);
    return Response(res, 500, { reason: e.message });
  }
};

// ─── GET /api/visits/stats  (super_admin) ────────────────────────────────────
// Statistiques détaillées : totaux, aujourd'hui, 7 derniers jours, top pages.
exports.getStats = async (req, res) => {
  try {
    const today = startOfToday();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // aujourd'hui inclus = 7 jours

    const [total, unique, todayTotal, todayUnique] = await Promise.all([
      SiteVisit.count(),
      SiteVisit.count({ distinct: true, col: 'visitorId' }),
      SiteVisit.count({ where: { createdAt: { [Op.gte]: today } } }),
      SiteVisit.count({ distinct: true, col: 'visitorId', where: { createdAt: { [Op.gte]: today } } }),
    ]);

    // Visites par jour sur les 7 derniers jours
    const dailyRows = await SiteVisit.findAll({
      attributes: [
        [fn('DATE', col('createdAt')), 'date'],
        [fn('COUNT', col('id')), 'visits'],
        [fn('COUNT', fn('DISTINCT', col('visitorId'))), 'unique'],
      ],
      where: { createdAt: { [Op.gte]: sevenDaysAgo } },
      group: [literal('DATE(createdAt)')],
      order: [literal('DATE(createdAt) ASC')],
      raw: true,
    });

    // Normalise sur 7 jours pleins (jours sans visite = 0)
    const byDate = {};
    dailyRows.forEach((r) => {
      const key = String(r.date).slice(0, 10);
      byDate[key] = { visits: Number(r.visits) || 0, unique: Number(r.unique) || 0 };
    });
    const last7days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      last7days.push({ date: key, visits: byDate[key]?.visits || 0, unique: byDate[key]?.unique || 0 });
    }

    // Top 5 des pages les plus visitées
    const topPagesRows = await SiteVisit.findAll({
      attributes: ['path', [fn('COUNT', col('id')), 'visits']],
      group: ['path'],
      order: [[literal('visits'), 'DESC']],
      limit: 5,
      raw: true,
    });
    const topPages = topPagesRows.map((r) => ({ path: r.path || '/', visits: Number(r.visits) || 0 }));

    return Response(res, 200, {
      total,
      unique,
      today: todayTotal,
      todayUnique,
      last7days,
      topPages,
    });
  } catch (e) {
    console.error('[Visit] stats error:', e.message);
    return Response(res, 500, { reason: e.message });
  }
};
