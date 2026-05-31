// routes/loginHistory.js
const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/loginHistory.controller');

const router = express.Router();

// Mon propre historique (tout utilisateur connecté)
router.get('/me', requireAuth, ctrl.getMyHistory);

// Tout l'historique — super_admin uniquement
router.get('/', requireAuth, requireRole('super_admin'), ctrl.getHistory);

// Purge des entrées > 24h — super_admin uniquement
router.delete('/purge', requireAuth, requireRole('super_admin'), ctrl.purgeOld);

module.exports = router;
