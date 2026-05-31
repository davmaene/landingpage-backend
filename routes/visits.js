// routes/visits.js
const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/visit.controller');

const router = express.Router();

// Enregistrement d'une visite (public)
router.post('/', ctrl.recordVisit);

// Compteur public (total + uniques) — affiché dans le footer
router.get('/count', ctrl.getCount);

// Statistiques détaillées — super_admin uniquement
router.get('/stats', requireAuth, requireRole('super_admin'), ctrl.getStats);

module.exports = router;
