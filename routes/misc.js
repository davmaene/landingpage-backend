// routes/misc.routes.js — Faculties, Search, Newsletter, Contact, Dashboard, Users
const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');
const c = require('../controllers/misc.controller');

const router = express.Router();

// Faculties
router.get('/faculties', c.listFaculties);
router.get('/faculties/:slug', c.getFaculty);
router.get('/faculties/:slug/filieres/:filiereSlug', c.getFiliere);

// Search
router.get('/search', c.search);

// Newsletter
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

module.exports = router;
