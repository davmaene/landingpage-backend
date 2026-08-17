const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/faqs.controller');

const router = express.Router();

router.get('/', ctrl.list);
router.get('/slug/:slug', ctrl.getBySlug);
router.get('/admin', requireAuth, requireRole('super_admin'), ctrl.adminList);
router.post('/', requireAuth, requireRole('super_admin'), ctrl.create);
router.put('/:id', requireAuth, requireRole('super_admin'), ctrl.update);
router.delete('/:id', requireAuth, requireRole('super_admin'), ctrl.remove);

module.exports = router;
