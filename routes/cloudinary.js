// routes/cloudinary.routes.js
const express = require('express');
const { requireAuth } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/cloudinary.controller');

const router = express.Router();

router.get('/config', requireAuth, ctrl.config);
router.get('/signature', requireAuth, ctrl.signature);

module.exports = router;
