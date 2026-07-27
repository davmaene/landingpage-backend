// routes/coursEvaluation.js
const express = require('express');
const { requireAuth } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/coursEvaluation.controller');

const router = express.Router();

// Promotions
router.get('/promotions', requireAuth, ctrl.listPromotions);
router.post('/promotions', requireAuth, ctrl.createPromotion);
router.put('/promotions/:id', requireAuth, ctrl.updatePromotion);
router.delete('/promotions/:id', requireAuth, ctrl.deletePromotion);

// UEs
router.get('/ues', requireAuth, ctrl.listUes);
router.post('/ues', requireAuth, ctrl.createUe);
router.put('/ues/:id', requireAuth, ctrl.updateUe);
router.delete('/ues/:id', requireAuth, ctrl.deleteUe);

// ECs
router.get('/ecs', requireAuth, ctrl.listEcs);
router.post('/ecs', requireAuth, ctrl.createEc);
router.put('/ecs/:id', requireAuth, ctrl.updateEc);
router.delete('/ecs/:id', requireAuth, ctrl.deleteEc);

// Attributions
router.get('/attributions', requireAuth, ctrl.listAttributions);
router.post('/attributions', requireAuth, ctrl.createAttribution);
router.put('/attributions/:id', requireAuth, ctrl.updateAttribution);
router.delete('/attributions/:id', requireAuth, ctrl.deleteAttribution);

// Teacher configs & Workload Report
router.get('/teacher-configs', requireAuth, ctrl.listTeacherConfigs);
router.post('/teacher-configs', requireAuth, ctrl.saveTeacherConfig);
router.get('/workload-report', requireAuth, ctrl.getTeacherWorkloadReport);

module.exports = router;
