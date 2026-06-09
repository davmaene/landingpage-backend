const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');
const c = require('../controllers/misc.controller');

const router = express.Router();

// Faculties
router.get('/faculties', c.listFaculties);
router.post('/faculties', requireAuth, requireRole('super_admin'), c.createFaculty);
router.put('/faculties/:id', requireAuth, requireRole('super_admin'), c.updateFaculty);
router.delete('/faculties/:id', requireAuth, requireRole('super_admin'), c.deleteFaculty);
router.get('/faculties/:slug', c.getFaculty);
router.get('/faculties/:slug/filieres/:filiereSlug', c.getFiliere);

// Search
router.get('/search', c.search);

// Newsletter
router.post('/newsletter/broadcast', requireAuth, requireRole('super_admin'), c.broadcastNewsletter);
router.post('/newsletter', c.subscribe);
router.get('/newsletter', requireAuth, requireRole('super_admin'), c.listNewsletter);

// Contact
router.post('/contact', c.sendContact);
router.get('/contact', requireAuth, requireRole('super_admin'), c.listContact);
router.delete('/contact/:id', requireAuth, requireRole('super_admin'), c.deleteContact);

// Dashboard
router.get('/dashboard/stats', requireAuth, c.stats);

// Users
router.get('/users', requireAuth, requireRole('super_admin'), c.listUsers);
router.put('/users/:id', requireAuth, requireRole('super_admin'), c.updateUser);
router.delete('/users/:id', requireAuth, requireRole('super_admin'), c.deleteUser);

// Special Programs
router.get('/special-programs', c.listSpecialPrograms);
router.get('/special-programs/:slug', c.getSpecialProgram);
router.post('/special-programs', requireAuth, requireRole('super_admin'), c.createSpecialProgram);
router.put('/special-programs/:id', requireAuth, requireRole('super_admin'), c.updateSpecialProgram);
router.delete('/special-programs/:id', requireAuth, requireRole('super_admin'), c.deleteSpecialProgram);

// Staff
router.get('/staff', c.listStaff);
router.get('/staff/:slug', c.getStaff);
router.post('/staff', requireAuth, requireRole('super_admin'), c.createStaff);
router.put('/staff/:id', requireAuth, requireRole('super_admin'), c.updateStaff);
router.delete('/staff/:id', requireAuth, requireRole('super_admin'), c.deleteStaff);

module.exports = router;
