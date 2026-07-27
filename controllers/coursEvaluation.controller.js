// controllers/coursEvaluation.controller.js
const { Promotion, Ue, Ec, Attribution, TeacherConfig, Faculty, StaffMember } = require('../models');
const { Response } = require('../utils/Response');

// ---------------- PROMOTIONS ----------------
exports.listPromotions = async (req, res) => {
  try {
    const items = await Promotion.findAll({
      include: [{ model: Faculty, as: 'faculty', attributes: ['id', 'name', 'slug'] }],
      order: [['name', 'ASC']]
    });
    return Response(res, 200, { length: items.length, rows: items });
  } catch (e) {
    return Response(res, 500, { reason: e.message });
  }
};

exports.createPromotion = async (req, res) => {
  try {
    const { name, facultyId } = req.body;
    if (!name?.trim() || !facultyId) {
      return Response(res, 401, { reason: 'Nom et faculté requis' });
    }
    const item = await Promotion.create({ name: name.trim(), facultyId });
    const full = await Promotion.findByPk(item.id, {
      include: [{ model: Faculty, as: 'faculty', attributes: ['id', 'name', 'slug'] }]
    });
    return Response(res, 201, { item: full });
  } catch (e) {
    return Response(res, 500, { reason: e.message });
  }
};

exports.updatePromotion = async (req, res) => {
  try {
    const item = await Promotion.findByPk(req.params.id);
    if (!item) return Response(res, 404, { reason: 'Promotion introuvable' });
    const { name, facultyId } = req.body;
    if (name !== undefined) item.name = name.trim();
    if (facultyId !== undefined) item.facultyId = facultyId;
    await item.save();
    const full = await Promotion.findByPk(item.id, {
      include: [{ model: Faculty, as: 'faculty', attributes: ['id', 'name', 'slug'] }]
    });
    return Response(res, 200, { item: full });
  } catch (e) {
    return Response(res, 500, { reason: e.message });
  }
};

exports.deletePromotion = async (req, res) => {
  try {
    const item = await Promotion.findByPk(req.params.id);
    if (!item) return Response(res, 404, { reason: 'Promotion introuvable' });
    await item.destroy();
    return Response(res, 200, { deleted: true });
  } catch (e) {
    return Response(res, 500, { reason: e.message });
  }
};


// ---------------- UEs ----------------
exports.listUes = async (req, res) => {
  try {
    const items = await Ue.findAll({
      include: [
        {
          model: Promotion,
          as: 'promotion',
          attributes: ['id', 'name'],
          include: [{ model: Faculty, as: 'faculty', attributes: ['id', 'name'] }]
        }
      ],
      order: [['name', 'ASC']]
    });
    return Response(res, 200, { length: items.length, rows: items });
  } catch (e) {
    return Response(res, 500, { reason: e.message });
  }
};

exports.createUe = async (req, res) => {
  try {
    const { code, name, promotionId } = req.body;
    if (!code?.trim() || !name?.trim() || !promotionId) {
      return Response(res, 401, { reason: 'Code, nom et promotion requis' });
    }
    const item = await Ue.create({ code: code.trim(), name: name.trim(), promotionId });
    const full = await Ue.findByPk(item.id, {
      include: [
        {
          model: Promotion,
          as: 'promotion',
          attributes: ['id', 'name'],
          include: [{ model: Faculty, as: 'faculty', attributes: ['id', 'name'] }]
        }
      ]
    });
    return Response(res, 201, { item: full });
  } catch (e) {
    return Response(res, 500, { reason: e.message });
  }
};

exports.updateUe = async (req, res) => {
  try {
    const item = await Ue.findByPk(req.params.id);
    if (!item) return Response(res, 404, { reason: 'UE introuvable' });
    const { code, name, promotionId } = req.body;
    if (code !== undefined) item.code = code.trim();
    if (name !== undefined) item.name = name.trim();
    if (promotionId !== undefined) item.promotionId = promotionId;
    await item.save();
    const full = await Ue.findByPk(item.id, {
      include: [
        {
          model: Promotion,
          as: 'promotion',
          attributes: ['id', 'name'],
          include: [{ model: Faculty, as: 'faculty', attributes: ['id', 'name'] }]
        }
      ]
    });
    return Response(res, 200, { item: full });
  } catch (e) {
    return Response(res, 500, { reason: e.message });
  }
};

exports.deleteUe = async (req, res) => {
  try {
    const item = await Ue.findByPk(req.params.id);
    if (!item) return Response(res, 404, { reason: 'UE introuvable' });
    await item.destroy();
    return Response(res, 200, { deleted: true });
  } catch (e) {
    return Response(res, 500, { reason: e.message });
  }
};


// ---------------- ECs ----------------
exports.listEcs = async (req, res) => {
  try {
    const items = await Ec.findAll({
      include: [
        {
          model: Ue,
          as: 'ue',
          attributes: ['id', 'name', 'code'],
          include: [
            {
              model: Promotion,
              as: 'promotion',
              attributes: ['id', 'name'],
              include: [{ model: Faculty, as: 'faculty', attributes: ['id', 'name'] }]
            }
          ]
        }
      ],
      order: [['name', 'ASC']]
    });
    return Response(res, 200, { length: items.length, rows: items });
  } catch (e) {
    return Response(res, 500, { reason: e.message });
  }
};

exports.createEc = async (req, res) => {
  try {
    const { code, name, credits, ueId } = req.body;
    if (!code?.trim() || !name?.trim() || !credits || !ueId) {
      return Response(res, 401, { reason: 'Code, nom, crédits et UE requis' });
    }
    const item = await Ec.create({ code: code.trim(), name: name.trim(), credits: Number(credits), ueId });
    const full = await Ec.findByPk(item.id, {
      include: [
        {
          model: Ue,
          as: 'ue',
          attributes: ['id', 'name', 'code'],
          include: [
            {
              model: Promotion,
              as: 'promotion',
              attributes: ['id', 'name'],
              include: [{ model: Faculty, as: 'faculty', attributes: ['id', 'name'] }]
            }
          ]
        }
      ]
    });
    return Response(res, 201, { item: full });
  } catch (e) {
    return Response(res, 500, { reason: e.message });
  }
};

exports.updateEc = async (req, res) => {
  try {
    const item = await Ec.findByPk(req.params.id);
    if (!item) return Response(res, 404, { reason: 'EC introuvable' });
    const { code, name, credits, ueId } = req.body;
    if (code !== undefined) item.code = code.trim();
    if (name !== undefined) item.name = name.trim();
    if (credits !== undefined) item.credits = Number(credits);
    if (ueId !== undefined) item.ueId = ueId;
    await item.save();
    const full = await Ec.findByPk(item.id, {
      include: [
        {
          model: Ue,
          as: 'ue',
          attributes: ['id', 'name', 'code'],
          include: [
            {
              model: Promotion,
              as: 'promotion',
              attributes: ['id', 'name'],
              include: [{ model: Faculty, as: 'faculty', attributes: ['id', 'name'] }]
            }
          ]
        }
      ]
    });
    return Response(res, 200, { item: full });
  } catch (e) {
    return Response(res, 500, { reason: e.message });
  }
};

exports.deleteEc = async (req, res) => {
  try {
    const item = await Ec.findByPk(req.params.id);
    if (!item) return Response(res, 404, { reason: 'EC introuvable' });
    await item.destroy();
    return Response(res, 200, { deleted: true });
  } catch (e) {
    return Response(res, 500, { reason: e.message });
  }
};


// ---------------- ATTRIBUTIONS ----------------
exports.listAttributions = async (req, res) => {
  try {
    const items = await Attribution.findAll({
      include: [
        {
          model: Ec,
          as: 'ec',
          include: [
            {
              model: Ue,
              as: 'ue',
              include: [
                {
                  model: Promotion,
                  as: 'promotion',
                  include: [{ model: Faculty, as: 'faculty' }]
                }
              ]
            }
          ]
        },
        { model: StaffMember, as: 'teacher', attributes: ['id', 'name', 'role', 'image', 'slug'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    return Response(res, 200, { length: items.length, rows: items });
  } catch (e) {
    return Response(res, 500, { reason: e.message });
  }
};

exports.createAttribution = async (req, res) => {
  try {
    const { ecId, teacherId, academicYear } = req.body;
    if (!ecId || !teacherId || !academicYear?.trim()) {
      return Response(res, 401, { reason: 'EC, enseignant et année académique requis' });
    }
    const item = await Attribution.create({ ecId, teacherId, academicYear: academicYear.trim() });
    const full = await Attribution.findByPk(item.id, {
      include: [
        {
          model: Ec,
          as: 'ec',
          include: [{ model: Ue, as: 'ue', include: [{ model: Promotion, as: 'promotion', include: [{ model: Faculty, as: 'faculty' }] }] }]
        },
        { model: StaffMember, as: 'teacher', attributes: ['id', 'name', 'role', 'image', 'slug'] }
      ]
    });
    return Response(res, 201, { item: full });
  } catch (e) {
    return Response(res, 500, { reason: e.message });
  }
};

exports.updateAttribution = async (req, res) => {
  try {
    const item = await Attribution.findByPk(req.params.id);
    if (!item) return Response(res, 404, { reason: 'Attribution introuvable' });
    const { ecId, teacherId, academicYear } = req.body;
    if (ecId !== undefined) item.ecId = ecId;
    if (teacherId !== undefined) item.teacherId = teacherId;
    if (academicYear !== undefined) item.academicYear = academicYear.trim();
    await item.save();
    const full = await Attribution.findByPk(item.id, {
      include: [
        {
          model: Ec,
          as: 'ec',
          include: [{ model: Ue, as: 'ue', include: [{ model: Promotion, as: 'promotion', include: [{ model: Faculty, as: 'faculty' }] }] }]
        },
        { model: StaffMember, as: 'teacher', attributes: ['id', 'name', 'role', 'image', 'slug'] }
      ]
    });
    return Response(res, 200, { item: full });
  } catch (e) {
    return Response(res, 500, { reason: e.message });
  }
};

exports.deleteAttribution = async (req, res) => {
  try {
    const item = await Attribution.findByPk(req.params.id);
    if (!item) return Response(res, 404, { reason: 'Attribution introuvable' });
    await item.destroy();
    return Response(res, 200, { deleted: true });
  } catch (e) {
    return Response(res, 500, { reason: e.message });
  }
};


// ---------------- TEACHER CONFIGS / WORKLOAD REPORT ----------------
exports.listTeacherConfigs = async (req, res) => {
  try {
    const items = await TeacherConfig.findAll({
      include: [{ model: StaffMember, as: 'teacher', attributes: ['id', 'name', 'role'] }],
      order: [['createdAt', 'DESC']]
    });
    return Response(res, 200, { length: items.length, rows: items });
  } catch (e) {
    return Response(res, 500, { reason: e.message });
  }
};

exports.saveTeacherConfig = async (req, res) => {
  try {
    const { teacherId, academicYear, requiredHours } = req.body;
    if (!teacherId || !academicYear?.trim() || requiredHours === undefined) {
      return Response(res, 401, { reason: 'teacherId, academicYear et requiredHours requis' });
    }

    const [item, created] = await TeacherConfig.findOrCreate({
      where: { teacherId, academicYear },
      defaults: { requiredHours: Number(requiredHours) }
    });

    if (!created) {
      item.requiredHours = Number(requiredHours);
      await item.save();
    }

    const full = await TeacherConfig.findByPk(item.id, {
      include: [{ model: StaffMember, as: 'teacher', attributes: ['id', 'name', 'role'] }]
    });

    return Response(res, 200, { item: full, created });
  } catch (e) {
    return Response(res, 500, { reason: e.message });
  }
};

exports.getTeacherWorkloadReport = async (req, res) => {
  try {
    const { academicYear, teacherId, facultyId, promotionId } = req.query;
    if (!academicYear) {
      return Response(res, 401, { reason: 'academicYear requis' });
    }

    // 1. Get staff
    const staffWhere = {};
    if (teacherId) staffWhere.id = teacherId;
    const teachers = await StaffMember.findAll({
      where: staffWhere,
      order: [['name', 'ASC']]
    });

    // 2. Get teacher configs
    const configs = await TeacherConfig.findAll({
      where: { academicYear }
    });
    const configMap = {};
    configs.forEach(c => {
      configMap[c.teacherId] = c.requiredHours;
    });

    // 3. Get attributions
    const attrWhere = { academicYear };
    if (teacherId) attrWhere.teacherId = teacherId;
    const attributions = await Attribution.findAll({
      where: attrWhere,
      include: [
        {
          model: Ec,
          as: 'ec',
          include: [
            {
              model: Ue,
              as: 'ue',
              include: [
                {
                  model: Promotion,
                  as: 'promotion',
                  include: [{ model: Faculty, as: 'faculty' }]
                }
              ]
            }
          ]
        }
      ]
    });

    // 4. Build reports
    const reportRows = teachers.map(t => {
      let teacherAttrs = attributions.filter(a => a.teacherId === t.id);

      if (facultyId) {
        teacherAttrs = teacherAttrs.filter(a => a.ec?.ue?.promotion?.facultyId === Number(facultyId));
      }
      if (promotionId) {
        teacherAttrs = teacherAttrs.filter(a => a.ec?.ue?.promotionId === Number(promotionId));
      }

      let totalCredits = 0;
      teacherAttrs.forEach(a => {
        if (a.ec) totalCredits += a.ec.credits || 0;
      });
      const totalHours = totalCredits * 15;
      const requiredHours = configMap[t.id] !== undefined ? configMap[t.id] : 120;
      const remainingHours = requiredHours - totalHours;

      return {
        teacher: {
          id: t.id,
          name: t.name,
          role: t.role,
          image: t.image
        },
        attributions: teacherAttrs,
        totalCredits,
        totalHours,
        requiredHours,
        remainingHours
      };
    });

    // Filter out teachers with no attributions if filters are applied
    let filteredReport = reportRows;
    if (facultyId || promotionId) {
      filteredReport = reportRows.filter(r => r.attributions.length > 0);
    }

    return Response(res, 200, { length: filteredReport.length, rows: filteredReport });
  } catch (e) {
    return Response(res, 500, { reason: e.message });
  }
};
