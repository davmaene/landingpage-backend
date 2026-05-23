// routes/centers.routes.js
const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/centers.controller');

const router = express.Router();

router.get('/', ctrl.list);
router.get('/slug/:slug', ctrl.getBySlug);
router.get('/admin', requireAuth, ctrl.adminList);
router.post('/', requireAuth, ctrl.create);
router.put('/:id', requireAuth, ctrl.update);
router.post('/:id/approve', requireAuth, requireRole('super_admin'), ctrl.approve);
router.post('/:id/reject', requireAuth, requireRole('super_admin'), ctrl.reject);
router.delete('/:id', requireAuth, ctrl.remove);

module.exports = router;
