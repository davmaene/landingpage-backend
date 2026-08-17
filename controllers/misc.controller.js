const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const slugify = require('slugify');
const { Faculty, Filiere, Content, Newsletter, ContactMessage, User, Schedule, Faq, Center, StaffMember, SpecialProgram, KeyFact, Rector, Partner, AdmissionGuide, serializeStaff, deserializeStaff } = require('../models');

const userIncludes = [
  { model: Faculty, as: 'faculty' },
  { model: Center, as: 'center', attributes: ['id', 'title', 'slug'] },
  { model: StaffMember, as: 'staff', attributes: ['id', 'name', 'role', 'slug'] },
];
const { sendMail, isConfigured } = require('../utils/mailer');
const { publicationBroadcastTemplate } = require('../utils/emailTemplates');
const { Response } = require('../utils/Response');

const staffRefAttributes = ['id', 'name', 'role', 'image', 'slug'];
const facultyStaffIncludes = [
  { model: StaffMember, as: 'deanStaff', attributes: staffRefAttributes },
  { model: StaffMember, as: 'secretaryStaff', attributes: staffRefAttributes },
];
const facultyIncludes = [{ model: Filiere, as: 'filieres' }, ...facultyStaffIncludes];

const staffNameById = async (staffId) => {
  if (!staffId) return null;
  const member = await StaffMember.findByPk(staffId, { attributes: ['name'] });
  return member ? member.name : null;
};

const uniqueFacultySlug = async (name, excludeId) => {
  let slug = slugify(name, { lower: true, strict: true });
  const where = { slug };
  if (excludeId) where.id = { [Op.ne]: excludeId };
  const existing = await Faculty.findOne({ where });
  if (existing) slug = `${slug}-${Date.now()}`;
  return slug;
};

const syncFilieres = async (facultyId, filieres = []) => {
  const keptIds = [];
  for (const fil of filieres) {
    if (!fil?.name?.trim()) continue;
    const fslug = slugify(fil.name, { lower: true, strict: true });
    const payload = {
      name: fil.name.trim(),
      nameEn: fil.nameEn?.trim() || null,
      slug: fslug,
      description: fil.description || null,
      descriptionEn: fil.descriptionEn || null,
      duration: fil.duration || null,
      durationEn: fil.durationEn || null,
      diploma: fil.diploma || null,
      diplomaEn: fil.diplomaEn || null,
    };
    if (fil.id) {
      const row = await Filiere.findOne({ where: { id: fil.id, facultyId } });
      if (row) {
        await row.update(payload);
        keptIds.push(row.id);
      }
    } else {
      const row = await Filiere.create({ ...payload, facultyId });
      keptIds.push(row.id);
    }
  }
  await Filiere.destroy({
    where: {
      facultyId,
      ...(keptIds.length ? { id: { [Op.notIn]: keptIds } } : {}),
    },
  });
};

// ---------------- Faculties ----------------
exports.listFaculties = async (req, res) => {
  const items = await Faculty.findAll({ include: facultyIncludes, order: [['name', 'ASC']] });
  return Response(res, 200, { length: items.length, rows: items });
};

exports.getFaculty = async (req, res) => {
  const item = await Faculty.findOne({
    where: { slug: req.params.slug },
    include: [
      { model: Filiere, as: 'filieres' },
      ...facultyStaffIncludes,
      {
        model: SpecialProgram,
        as: 'specialPrograms',
        where: { isActive: true },
        required: false,
        include: [{
          model: Content,
          as: 'contents',
          where: { status: 'published' },
          required: false,
        }],
      },
    ],
    order: [[{ model: SpecialProgram, as: 'specialPrograms' }, 'name', 'ASC']],
  });
  if (!item) return Response(res, 404, {});
  return Response(res, 200, { item });
};

exports.getFiliere = async (req, res) => {
  const faculty = await Faculty.findOne({ where: { slug: req.params.slug } });
  if (!faculty) return Response(res, 404, { reason: 'Faculté introuvable' });
  const filiere = await Filiere.findOne({ where: { facultyId: faculty.id, slug: req.params.filiereSlug } });
  if (!filiere) return Response(res, 404, { reason: 'Filière introuvable' });
  return Response(res, 200, { faculty, filiere });
};

exports.createFaculty = async (req, res) => {
  try {
    const {
      name, nameEn, domaine, domaineEn, description, descriptionEn,
      dean, deanEn, secretary, secretaryEn, deanStaffId, secretaryStaffId,
      coverImage, filieres,
    } = req.body;
    if (!name?.trim() || !domaine?.trim())
      return Response(res, 401, { reason: 'Nom et domaine requis' });
    const slug = await uniqueFacultySlug(name.trim());
    const deanFromStaff = await staffNameById(deanStaffId);
    const secretaryFromStaff = await staffNameById(secretaryStaffId);
    const faculty = await Faculty.create({
      name: name.trim(),
      nameEn: nameEn?.trim() || null,
      slug,
      domaine: domaine.trim(),
      domaineEn: domaineEn?.trim() || null,
      description: description || null,
      descriptionEn: descriptionEn || null,
      dean: deanFromStaff || dean || null,
      deanEn: deanEn || null,
      secretary: secretaryFromStaff || secretary || null,
      secretaryEn: secretaryEn || null,
      deanStaffId: deanStaffId || null,
      secretaryStaffId: secretaryStaffId || null,
      coverImage: coverImage || null,
    });
    if (Array.isArray(filieres)) await syncFilieres(faculty.id, filieres);
    const item = await Faculty.findByPk(faculty.id, { include: facultyIncludes });
    return Response(res, 201, { item });
  } catch (e) {
    return Response(res, 500, { reason: e.message });
  }
};

exports.updateFaculty = async (req, res) => {
  try {
    const faculty = await Faculty.findByPk(req.params.id);
    if (!faculty) return Response(res, 404, { reason: 'Faculté introuvable' });
    const {
      name, nameEn, domaine, domaineEn, description, descriptionEn,
      dean, deanEn, secretary, secretaryEn, deanStaffId, secretaryStaffId,
      coverImage, filieres,
    } = req.body;
    if (name?.trim()) {
      faculty.name = name.trim();
      faculty.slug = await uniqueFacultySlug(name.trim(), faculty.id);
    }
    if (nameEn !== undefined) faculty.nameEn = nameEn?.trim() || null;
    if (domaine?.trim()) faculty.domaine = domaine.trim();
    if (domaineEn !== undefined) faculty.domaineEn = domaineEn?.trim() || null;
    if (description !== undefined) faculty.description = description || null;
    if (descriptionEn !== undefined) faculty.descriptionEn = descriptionEn || null;
    if (deanStaffId !== undefined) {
      faculty.deanStaffId = deanStaffId || null;
      const deanFromStaff = await staffNameById(deanStaffId);
      if (deanFromStaff) faculty.dean = deanFromStaff;
      else if (dean !== undefined) faculty.dean = dean || null;
    } else if (dean !== undefined) faculty.dean = dean || null;
    if (deanEn !== undefined) faculty.deanEn = deanEn || null;
    if (secretaryStaffId !== undefined) {
      faculty.secretaryStaffId = secretaryStaffId || null;
      const secretaryFromStaff = await staffNameById(secretaryStaffId);
      if (secretaryFromStaff) faculty.secretary = secretaryFromStaff;
      else if (secretary !== undefined) faculty.secretary = secretary || null;
    } else if (secretary !== undefined) faculty.secretary = secretary || null;
    if (secretaryEn !== undefined) faculty.secretaryEn = secretaryEn || null;
    if (coverImage !== undefined) faculty.coverImage = coverImage || null;
    await faculty.save();
    if (Array.isArray(filieres)) await syncFilieres(faculty.id, filieres);
    const item = await Faculty.findByPk(faculty.id, { include: facultyIncludes });
    return Response(res, 200, { item });
  } catch (e) {
    return Response(res, 500, { reason: e.message });
  }
};

exports.deleteFaculty = async (req, res) => {
  try {
    const faculty = await Faculty.findByPk(req.params.id);
    if (!faculty) return Response(res, 404, { reason: 'Faculté introuvable' });
    const publishers = await User.count({ where: { facultyId: faculty.id } });
    if (publishers > 0)
      return Response(res, 401, { reason: 'Impossible de supprimer : des utilisateurs sont rattachés à cette faculté' });
    await faculty.destroy();
    return Response(res, 200, { deleted: true });
  } catch (e) {
    return Response(res, 500, { reason: e.message });
  }
};

exports.search = async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return Response(res, 200, { q: '', contents: [], faculties: [], filieres: [] });
  const like = { [Op.like]: `%${q}%` };
  const [contents, faculties, filieres] = await Promise.all([
    Content.findAll({
      where: { status: 'published', [Op.or]: [{ title: like }, { excerpt: like }, { content: like }, { category: like }] },
      limit: 20, order: [['publishedAt', 'DESC']],
    }),
    Faculty.findAll({ where: { [Op.or]: [{ name: like }, { domaine: like }, { description: like }] }, limit: 10 }),
    Filiere.findAll({
      where: { [Op.or]: [{ name: like }, { description: like }] },
      include: [{ model: Faculty, as: 'faculty' }], limit: 10,
    }),
  ]);
  return Response(res, 200, { q, contents, faculties, filieres });
};

exports.subscribe = async (req, res) => {
  try {
    const email = String(req.body.email || '').toLowerCase().trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return Response(res, 405, { reason: 'Email invalide' });

    const [, created] = await Newsletter.findOrCreate({ where: { email } });

    if (created) {
      const welcomeHtml = `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Bienvenue à l'ULPGL</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; -webkit-font-smoothing: antialiased;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f6f8; padding: 40px 10px;">
            <tr>
              <td align="center">
                <!-- Conteneur Principal -->
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                  
                  <!-- En-tête / Bannière -->
                  <tr>
                    <td align="center" style="background-color: #003366; padding: 40px 20px;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;">
                        ULPGL Goma
                      </h1>
                      <p style="color: #a5c4e2; margin: 5px 0 0 0; font-size: 14px;">Université Libre des Pays des Grands Lacs</p>
                    </td>
                  </tr>
                  
                  <!-- Corps du Message -->
                  <tr>
                    <td style="padding: 40px 30px; color: #333333; line-height: 1.6;">
                      <h2 style="color: #003366; margin-top: 0; font-size: 20px; font-weight: 600;">
                        Merci pour votre inscription !
                      </h2>
                      <p style="font-size: 16px; color: #555555; margin-bottom: 25px;">
                        Nous sommes ravis de vous compter parmi les abonnés à notre newsletter officielle. Vous recevrez désormais en avant-première toutes les actualités, événements, communiqués et opportunités de l'ULPGL-Goma.
                      </p>
                      
                      <!-- Bouton d'action (Optionnel mais pro) -->
                      <table border="0" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                        <tr>
                          <td align="center" style="background-color: #003366; border-radius: 4px;">
                            <a href="https://ulpgl.net" target="_blank" style="padding: 12px 25px; color: #ffffff; display: inline-block; font-size: 15px; font-weight: bold; text-decoration: none; letter-spacing: 0.5px;">
                              Visiter notre site web
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <hr style="border: 0; border-top: 1px solid #eef2f5; margin: 30px 0;">
                      
                      <p style="font-size: 14px; color: #777777; margin: 0;">
                        À très bientôt,<br>
                        <strong>L'équipe de communication de l'ULPGL</strong>
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Pied de page -->
                  <tr>
                    <td align="center" style="background-color: #f8fafc; padding: 20px; border-top: 1px solid #eef2f5;">
                      <p style="margin: 0; font-size: 12px; color: #999999;">
                        &copy; ${new Date().getFullYear()} ULPGL-Goma. Tous droits réservés.
                      </p>
                      <p style="margin: 5px 0 0 0; font-size: 11px; color: #bbbbbb;">
                        Vous recevez cet e-mail car vous vous êtes inscrit sur notre site.
                      </p>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      sendMail({
        to: email,
        subject: "✨ Bienvenue à la newsletter de l'ULPGL-Goma",
        text: "Merci pour votre inscription à la newsletter de l'ULPGL-Goma. Vous recevrez bientôt nos prochaines actualités.", // Version texte brute alternative
        html: welcomeHtml,
      });
    }

    return Response(res, 200, { subscribed: true, alreadyExists: !created });
  } catch (e) {
    return Response(res, 500, { reason: e.message });
  }
};

exports.listNewsletter = async (req, res) => {
  const items = await Newsletter.findAll({ order: [['createdAt', 'DESC']] });
  return Response(res, 200, { length: items.length, rows: items });
};

exports.broadcastNewsletter = async (req, res) => {
  try {
    const { contentId, recipientIds, mode } = req.body;
    if (!contentId) return Response(res, 400, { reason: 'contentId requis' });

    const authorIncludes = [
      { model: User, as: 'author', attributes: ['id', 'name', 'email', 'role'] },
      { model: Faculty, as: 'faculty', attributes: ['id', 'name', 'slug'] },
    ];
    const item = await Content.findByPk(contentId, { include: authorIncludes });
    if (!item) return Response(res, 404, { reason: 'Contenu introuvable' });

    const all = mode === 'all';
    const ids = Array.isArray(recipientIds) ? recipientIds : [];

    const where = { isActive: true };
    if (!all) {
      if (!ids.length) return Response(res, 400, { reason: 'Aucun destinataire sélectionné' });
      where.id = { [Op.in]: ids };
    }

    const subs = await Newsletter.findAll({ where, attributes: ['id', 'email'] });
    const emails = [...new Set(subs.map((s) => s.email).filter(Boolean))];
    if (!emails.length) return Response(res, 200, { sent: 0, total: 0, reason: 'Aucun abonné' });

    const frontendUrl = process.env.FRONTEND_URL || 'https://ulpgl.net';
    const { subject, html, text } = publicationBroadcastTemplate({ content: item, frontendUrl });

    if (!isConfigured()) {
      return Response(res, 200, { sent: 0, total: emails.length, skipped: true, reason: 'SMTP non configuré (mode skip)' });
    }

    const chunkSize = 50;
    let sent = 0;
    const errors = [];
    for (let i = 0; i < emails.length; i += chunkSize) {
      const chunk = emails.slice(i, i + chunkSize);
      const r = await sendMail({ bcc: chunk, subject, html, text });
      if (r.sent) sent += chunk.length;
      else if (r.error) errors.push(r.error);
    }
    console.table(emails)
    return Response(res, 200, { sent, total: emails.length, errors: errors.length ? errors : undefined });
  } catch (e) {
    console.error('[Broadcast]', e);
    return Response(res, 500, { reason: e.message });
  }
};

exports.sendContact = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !subject || !message)
      return Response(res, 401, { reason: 'Tous les champs sont requis' });
    const item = await ContactMessage.create({
      name: String(name).trim(),
      email: String(email).toLowerCase().trim(),
      subject: String(subject).trim(),
      message: String(message).trim(),
    });
    sendMail({
      to: process.env.REPORTER_EMAIL,
      subject: `Nouveau message: ${subject}`,
      html: `<h3>Message reçu via le site ULPGL</h3>
        <p><b>De :</b> ${name} &lt;${email}&gt;</p>
        <p><b>Objet :</b> ${subject}</p>
        <p>${message.replace(/\n/g, '<br>')}</p>`,
    });
    return Response(res, 201, { id: item.id });
  } catch (e) {
    return Response(res, 500, { reason: e.message });
  }
};

exports.listContact = async (req, res) => {
  const items = await ContactMessage.findAll({ order: [['createdAt', 'DESC']] });
  return Response(res, 200, { length: items.length, rows: items });
};

exports.deleteContact = async (req, res) => {
  await ContactMessage.destroy({ where: { id: req.params.id } });
  return Response(res, 200, { deleted: true });
};

// ---------------- Dashboard ----------------
exports.stats = async (req, res) => {
  const isAdmin = req.user.role === 'super_admin';
  const whereAuthor = isAdmin ? {} : { authorId: req.user.id };
  const [
    total, pending, published, rejected, newsletters, messages,
    schedulesTotal, schedulesPending,
    articles, events, activities,
  ] = await Promise.all([
    Content.count({ where: whereAuthor }),
    Content.count({ where: { ...whereAuthor, status: 'pending' } }),
    Content.count({ where: { ...whereAuthor, status: 'published' } }),
    Content.count({ where: { ...whereAuthor, status: 'rejected' } }),
    isAdmin ? Newsletter.count() : Promise.resolve(0),
    isAdmin ? ContactMessage.count({ where: { isRead: false } }) : Promise.resolve(0),
    Schedule.count({ where: whereAuthor }),
    Schedule.count({ where: { ...whereAuthor, status: 'pending' } }),
    Content.count({ where: { ...whereAuthor, type: 'article' } }),
    Content.count({ where: { ...whereAuthor, type: 'event' } }),
    Content.count({ where: { ...whereAuthor, type: 'activity' } }),
  ]);

  const base = {
    total, pending, published, rejected, newsletters, messages,
    schedulesTotal, schedulesPending,
    articles, events, activities,
    activitiesEvents: events + activities,
  };

  if (!isAdmin) return Response(res, 200, base);

  const [faculties, filieres, centers, faqs, personnel, specialPrograms, domaines, categories] = await Promise.all([
    Faculty.count(),
    Filiere.count(),
    Center.count(),
    Faq.count(),
    StaffMember.count(),
    SpecialProgram.count(),
    Faculty.count({ distinct: true, col: 'domaine' }),
    Content.count({
      distinct: true,
      col: 'category',
      where: { category: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }] } },
    }),
  ]);

  return Response(res, 200, {
    ...base,
    faculties,
    filieres,
    centers,
    faqs,
    personnel,
    specialPrograms,
    domaines,
    categories,
    keyFigures: 0,
  });
};

// ---------------- Users ----------------
exports.listUsers = async (req, res) => {
  const items = await User.findAll({
    attributes: { exclude: ['password'] },
    include: userIncludes,
    order: [['createdAt', 'DESC']],
  });
  return Response(res, 200, { length: items.length, rows: items });
};

exports.updateUser = async (req, res) => {
  try {
    const u = await User.findByPk(req.params.id);
    if (!u) return Response(res, 404, { reason: 'Utilisateur introuvable' });
    const { name, email, role, facultyId, centerId, staffId, isActive, password } = req.body;
    if (name !== undefined) u.name = String(name).trim();
    if (email !== undefined) {
      const normalized = String(email).toLowerCase().trim();
      const exists = await User.findOne({ where: { email: normalized, id: { [Op.ne]: u.id } } });
      if (exists) return Response(res, 405, { reason: 'Email déjà utilisé' });
      u.email = normalized;
    }
    if (role !== undefined) {
      if (role === 'super_admin') u.role = 'super_admin';
      else if (role === 'center_publisher') u.role = 'center_publisher';
      else u.role = 'faculty_publisher';
    }
    if (facultyId !== undefined) u.facultyId = facultyId || null;
    if (centerId !== undefined) u.centerId = centerId || null;
    if (staffId !== undefined) u.staffId = staffId || null;
    if (isActive !== undefined) u.isActive = !!isActive;
    if (password) {
      if (password.length < 6) return Response(res, 405, { reason: 'Mot de passe trop court (min 6)' });
      u.password = await bcrypt.hash(password, 10);
    }
    if (u.role === 'faculty_publisher') {
      u.centerId = null;
      if (!u.facultyId) return Response(res, 401, { reason: 'Une faculté est requise pour un publieur faculté' });
    }
    if (u.role === 'center_publisher') {
      u.facultyId = null;
      if (!u.centerId) return Response(res, 401, { reason: 'Un centre est requis pour un publieur centre' });
    }
    if (u.role === 'super_admin') {
      u.facultyId = null;
      u.centerId = null;
    }
    await u.save();
    const safe = await User.findByPk(u.id, {
      attributes: { exclude: ['password'] },
      include: userIncludes,
    });
    return Response(res, 200, { user: safe });
  } catch (e) {
    return Response(res, 500, { reason: e.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    if (String(req.params.id) === String(req.user.id))
      return Response(res, 401, { reason: 'Vous ne pouvez pas supprimer votre propre compte' });
    const u = await User.findByPk(req.params.id);
    if (!u) return Response(res, 404, { reason: 'Utilisateur introuvable' });
    await u.destroy();
    return Response(res, 200, { deleted: true });
  } catch (e) {
    return Response(res, 500, { reason: e.message });
  }
};

exports.listStaff = async (req, res) => {
  try {
    const items = await StaffMember.findAll({ order: [['name', 'ASC']] });
    const rows = items.map(deserializeStaff);
    return Response(res, 200, { length: rows.length, rows });
  } catch (e) {
    return Response(res, 500, { reason: e.message });
  }
};

exports.getStaff = async (req, res) => {
  try {
    const item = await StaffMember.findOne({ where: { slug: req.params.slug } });
    if (!item) return Response(res, 404, { reason: 'Membre du personnel introuvable' });
    return Response(res, 200, { item: deserializeStaff(item) });
  } catch (e) {
    return Response(res, 500, { reason: e.message });
  }
};

const uniqueStaffSlug = async (name, excludeId) => {
  let slug = slugify(name, { lower: true, strict: true });
  const where = { slug };
  if (excludeId) where.id = { [Op.ne]: excludeId };
  const existing = await StaffMember.findOne({ where });
  if (existing) slug = `${slug}-${Date.now()}`;
  return slug;
};

exports.createStaff = async (req, res) => {
  try {
    const { name, role, email, phone, image, isOrganizer, extra, socialLinks, description } = req.body;
    if (!name?.trim() || !role?.trim())
      return Response(res, 401, { reason: 'Nom et rôle requis' });
    const slug = await uniqueStaffSlug(name.trim());
    const payload = serializeStaff({
      description: description || null,
      slug,
      name: name.trim(),
      role: role.trim(),
      email,
      phone,
      image,
      isOrganizer: !!isOrganizer,
      extra,
      socialLinks,
    });
    const item = await StaffMember.create(payload);
    return Response(res, 201, { item: deserializeStaff(item) });
  } catch (e) {
    return Response(res, 500, { reason: e.message });
  }
};

exports.updateStaff = async (req, res) => {
  try {
    const item = await StaffMember.findByPk(req.params.id);
    if (!item) return Response(res, 404, { reason: 'Membre du personnel introuvable' });
    const { name, role, email, phone, image, isOrganizer, extra, socialLinks } = req.body;

    if (name?.trim()) {
      item.name = name.trim();
      item.slug = await uniqueStaffSlug(name.trim(), item.id);
    }
    if (role?.trim()) item.role = role.trim();
    if (email !== undefined) item.email = email;
    if (phone !== undefined) item.phone = phone;
    if (image !== undefined) item.image = image;
    if (isOrganizer !== undefined) item.isOrganizer = !!isOrganizer;
    if (extra !== undefined) item.extra = extra;
    if (socialLinks !== undefined) item.socialLinks = socialLinks;

    const payload = serializeStaff(item.get ? item.get({ plain: true }) : item);
    await item.update(payload);

    return Response(res, 200, { item: deserializeStaff(item) });
  } catch (e) {
    return Response(res, 500, { reason: e.message });
  }
};

exports.deleteStaff = async (req, res) => {
  try {
    const item = await StaffMember.findByPk(req.params.id);
    if (!item) return Response(res, 404, { reason: 'Membre du personnel introuvable' });
    await item.destroy();
    return Response(res, 200, { deleted: true });
  } catch (e) {
    return Response(res, 500, { reason: e.message });
  }
};

// ---------------- Special Programs ----------------
const specialProgramIncludes = [
  { model: Faculty, as: 'faculty', attributes: ['id', 'name', 'slug'] },
];

const uniqueSpecialProgramSlug = async (name, excludeId) => {
  let slug = slugify(name, { lower: true, strict: true });
  const where = { slug };
  if (excludeId) where.id = { [Op.ne]: excludeId };
  const existing = await SpecialProgram.findOne({ where });
  if (existing) slug = `${slug}-${Date.now()}`;
  return slug;
};

exports.listSpecialPrograms = async (req, res) => {
  try {
    const where = {};
    if (req.query.facultyId) where.facultyId = req.query.facultyId;
    const items = await SpecialProgram.findAll({
      where,
      include: specialProgramIncludes,
      order: [['name', 'ASC']],
    });
    return Response(res, 200, { length: items.length, rows: items });
  } catch (e) {
    return Response(res, 500, { reason: e.message });
  }
};

exports.getSpecialProgram = async (req, res) => {
  try {
    const item = await SpecialProgram.findOne({
      where: { slug: req.params.slug },
      include: [
        { model: Faculty, as: 'faculty', attributes: ['id', 'name', 'slug'] },
        { model: Content, as: 'contents', where: { status: 'published' }, required: false },
      ],
    });
    if (!item) return Response(res, 404, { reason: 'Programme introuvable' });
    return Response(res, 200, { item });
  } catch (e) {
    return Response(res, 500, { reason: e.message });
  }
};

exports.createSpecialProgram = async (req, res) => {
  try {
    const { name, nameEn, description, descriptionEn, coverImage, facultyId, isActive } = req.body;
    if (!name?.trim() || !facultyId)
      return Response(res, 401, { reason: 'Nom et faculté requis' });
    const faculty = await Faculty.findByPk(facultyId);
    if (!faculty) return Response(res, 404, { reason: 'Faculté introuvable' });
    const slug = await uniqueSpecialProgramSlug(name.trim());
    const item = await SpecialProgram.create({
      name: name.trim(),
      nameEn: nameEn?.trim() || null,
      slug,
      description: description || null,
      descriptionEn: descriptionEn || null,
      coverImage: coverImage || null,
      facultyId,
      isActive: isActive === undefined ? true : !!isActive,
    });
    const created = await SpecialProgram.findByPk(item.id, { include: specialProgramIncludes });
    return Response(res, 201, { item: created });
  } catch (e) {
    return Response(res, 500, { reason: e.message });
  }
};

exports.updateSpecialProgram = async (req, res) => {
  try {
    const item = await SpecialProgram.findByPk(req.params.id);
    if (!item) return Response(res, 404, { reason: 'Programme introuvable' });
    const { name, nameEn, description, descriptionEn, coverImage, facultyId, isActive } = req.body;
    if (name?.trim()) {
      item.name = name.trim();
      item.slug = await uniqueSpecialProgramSlug(name.trim(), item.id);
    }
    if (nameEn !== undefined) item.nameEn = nameEn?.trim() || null;
    if (description !== undefined) item.description = description || null;
    if (descriptionEn !== undefined) item.descriptionEn = descriptionEn || null;
    if (coverImage !== undefined) item.coverImage = coverImage || null;
    if (facultyId !== undefined && facultyId) {
      const faculty = await Faculty.findByPk(facultyId);
      if (!faculty) return Response(res, 404, { reason: 'Faculté introuvable' });
      item.facultyId = facultyId;
    }
    if (isActive !== undefined) item.isActive = !!isActive;
    await item.save();
    const updated = await SpecialProgram.findByPk(item.id, { include: specialProgramIncludes });
    return Response(res, 200, { item: updated });
  } catch (e) {
    return Response(res, 500, { reason: e.message });
  }
};

exports.deleteSpecialProgram = async (req, res) => {
  try {
    const item = await SpecialProgram.findByPk(req.params.id);
    if (!item) return Response(res, 404, { reason: 'Programme introuvable' });
    await Content.update({ specialProgramId: null }, { where: { specialProgramId: item.id } });
    await item.destroy();
    return Response(res, 200, { deleted: true });
  } catch (e) {
    return Response(res, 500, { reason: e.message });
  }
};

// ---------------- Key Facts ----------------
exports.listKeyFacts = async (req, res) => {
  try {
    const where = {};
    if (req.query.activeOnly === 'true') where.isActive = true;
    const items = await KeyFact.findAll({ where, order: [['sortOrder', 'ASC'], ['id', 'ASC']] });
    return Response(res, 200, { length: items.length, rows: items });
  } catch (e) {
    return Response(res, 500, { reason: e.message });
  }
};

exports.getKeyFact = async (req, res) => {
  try {
    const item = await KeyFact.findByPk(req.params.id);
    if (!item) return Response(res, 404, { reason: 'Fait clé introuvable' });
    return Response(res, 200, { item });
  } catch (e) {
    return Response(res, 500, { reason: e.message });
  }
};

exports.createKeyFact = async (req, res) => {
  try {
    const { title, titleEn, value, sortOrder, isActive } = req.body;
    if (!title?.trim() || !value?.trim())
      return Response(res, 401, { reason: 'Titre et valeur requis' });
    const item = await KeyFact.create({
      title: title.trim(),
      titleEn: titleEn?.trim() || null,
      value: value.trim(),
      sortOrder: sortOrder ?? 0,
      isActive: isActive === undefined ? true : !!isActive,
    });
    return Response(res, 201, { item });
  } catch (e) {
    return Response(res, 500, { reason: e.message });
  }
};

exports.updateKeyFact = async (req, res) => {
  try {
    const item = await KeyFact.findByPk(req.params.id);
    if (!item) return Response(res, 404, { reason: 'Fait clé introuvable' });
    const { title, titleEn, value, sortOrder, isActive } = req.body;
    if (title?.trim()) item.title = title.trim();
    if (titleEn !== undefined) item.titleEn = titleEn?.trim() || null;
    if (value?.trim()) item.value = value.trim();
    if (sortOrder !== undefined) item.sortOrder = sortOrder;
    if (isActive !== undefined) item.isActive = !!isActive;
    await item.save();
    return Response(res, 200, { item });
  } catch (e) {
    return Response(res, 500, { reason: e.message });
  }
};

exports.deleteKeyFact = async (req, res) => {
  try {
    const item = await KeyFact.findByPk(req.params.id);
    if (!item) return Response(res, 404, { reason: 'Fait clé introuvable' });
    await item.destroy();
    return Response(res, 200, { deleted: true });
  } catch (e) {
    return Response(res, 500, { reason: e.message });
  }
};

// ---------------- Rectors (succession timeline) ----------------
exports.listRectors = async (req, res) => {
  try {
    const items = await Rector.findAll({
      order: [['startYear', 'ASC'], ['sortOrder', 'ASC']],
    });
    return Response(res, 200, { length: items.length, rows: items });
  } catch (e) {
    return Response(res, 500, { reason: e.message });
  }
};

exports.getRector = async (req, res) => {
  try {
    const item = await Rector.findByPk(req.params.id);
    if (!item) return Response(res, 404, { reason: 'Recteur introuvable' });
    return Response(res, 200, { item });
  } catch (e) {
    return Response(res, 500, { reason: e.message });
  }
};

exports.createRector = async (req, res) => {
  try {
    const { name, startYear, endYear, image, bio, sortOrder, isActive } = req.body;
    if (!name?.trim() || startYear == null)
      return Response(res, 401, { reason: 'Nom et année de début requis' });
    let slug = slugify(name.trim(), { lower: true, strict: true });
    const existing = await Rector.findOne({ where: { slug } });
    if (existing) slug = `${slug}-${Date.now()}`;
    const item = await Rector.create({
      name: name.trim(),
      slug: existing ? `${slug}-${Date.now()}` : slug,
      startYear: Number(startYear),
      endYear: endYear != null ? Number(endYear) : null,
      image: image || null,
      bio: bio || null,
      sortOrder: sortOrder ?? 0,
      isActive: isActive === undefined ? true : !!isActive,
    });
    return Response(res, 201, { item });
  } catch (e) {
    return Response(res, 500, { reason: e.message });
  }
};

exports.updateRector = async (req, res) => {
  try {
    const item = await Rector.findByPk(req.params.id);
    if (!item) return Response(res, 404, { reason: 'Recteur introuvable' });
    const { name, startYear, endYear, image, bio, sortOrder, isActive } = req.body;
    if (name?.trim()) {
      item.name = name.trim();
      item.slug = slugify(name.trim(), { lower: true, strict: true });
    }
    if (startYear != null) item.startYear = Number(startYear);
    if (endYear !== undefined) item.endYear = endYear != null ? Number(endYear) : null;
    if (image !== undefined) item.image = image || null;
    if (bio !== undefined) item.bio = bio || null;
    if (sortOrder !== undefined) item.sortOrder = sortOrder;
    if (isActive !== undefined) item.isActive = !!isActive;
    await item.save();
    return Response(res, 200, { item });
  } catch (e) {
    return Response(res, 500, { reason: e.message });
  }
};

exports.deleteRector = async (req, res) => {
  try {
    const item = await Rector.findByPk(req.params.id);
    if (!item) return Response(res, 404, { reason: 'Recteur introuvable' });
    await item.destroy();
    return Response(res, 200, { deleted: true });
  } catch (e) {
    return Response(res, 500, { reason: e.message });
  }
};

// ---------------- Partners ----------------
exports.listPartners = async (req, res) => {
  try {
    const where = {};
    if (req.query.activeOnly === 'true') where.isActive = true;
    const items = await Partner.findAll({ where, order: [['sortOrder', 'ASC'], ['name', 'ASC']] });
    return Response(res, 200, { length: items.length, rows: items });
  } catch (e) {
    return Response(res, 500, { reason: e.message });
  }
};

exports.getPartner = async (req, res) => {
  try {
    const item = await Partner.findByPk(req.params.id);
    if (!item) return Response(res, 404, { reason: 'Partenaire introuvable' });
    return Response(res, 200, { item });
  } catch (e) {
    return Response(res, 500, { reason: e.message });
  }
};

exports.getPartnerBySlug = async (req, res) => {
  try {
    const item = await Partner.findOne({ where: { slug: req.params.slug } });
    if (!item) return Response(res, 404, { reason: 'Partenaire introuvable' });
    return Response(res, 200, { item });
  } catch (e) {
    return Response(res, 500, { reason: e.message });
  }
};

exports.createPartner = async (req, res) => {
  try {
    const { name, logo, url, description, sortOrder, isActive } = req.body;
    if (!name?.trim())
      return Response(res, 401, { reason: 'Nom requis' });
    let slug = slugify(name.trim(), { lower: true, strict: true });
    const existing = await Partner.findOne({ where: { slug } });
    if (existing) slug = `${slug}-${Date.now()}`;
    const item = await Partner.create({
      name: name.trim(),
      slug,
      logo: logo || null,
      url: url || null,
      description: description || null,
      sortOrder: sortOrder ?? 0,
      isActive: isActive === undefined ? true : !!isActive,
    });
    return Response(res, 201, { item });
  } catch (e) {
    return Response(res, 500, { reason: e.message });
  }
};

exports.updatePartner = async (req, res) => {
  try {
    const item = await Partner.findByPk(req.params.id);
    if (!item) return Response(res, 404, { reason: 'Partenaire introuvable' });
    const { name, logo, url, description, sortOrder, isActive } = req.body;
    if (name?.trim()) {
      item.name = name.trim();
      item.slug = slugify(name.trim(), { lower: true, strict: true });
    }
    if (logo !== undefined) item.logo = logo || null;
    if (url !== undefined) item.url = url || null;
    if (description !== undefined) item.description = description || null;
    if (sortOrder !== undefined) item.sortOrder = sortOrder;
    if (isActive !== undefined) item.isActive = !!isActive;
    await item.save();
    return Response(res, 200, { item });
  } catch (e) {
    return Response(res, 500, { reason: e.message });
  }
};

exports.deletePartner = async (req, res) => {
  try {
    const item = await Partner.findByPk(req.params.id);
    if (!item) return Response(res, 404, { reason: 'Partenaire introuvable' });
    await item.destroy();
    return Response(res, 200, { deleted: true });
  } catch (e) {
    return Response(res, 500, { reason: e.message });
  }
};

// ---------------- Admission Guide (singleton) ----------------
exports.getAdmissionGuide = async (req, res) => {
  try {
    const item = await AdmissionGuide.findOne({ order: [['id', 'ASC']] });
    return Response(res, 200, { item: item || null });
  } catch (e) {
    return Response(res, 500, { reason: e.message });
  }
};

exports.saveAdmissionGuide = async (req, res) => {
  try {
    const { title, academicYear, introHtml, contentHtml, contactPhones } = req.body;
    let item = await AdmissionGuide.findOne({ order: [['id', 'ASC']] });
    if (!item) item = AdmissionGuide.build({});
    if (title !== undefined) item.title = title?.trim() || "Guide d'inscription";
    if (academicYear !== undefined) item.academicYear = academicYear?.trim() || null;
    if (introHtml !== undefined) item.introHtml = introHtml || null;
    if (contentHtml !== undefined) item.contentHtml = contentHtml || null;
    if (contactPhones !== undefined) item.contactPhones = contactPhones?.trim() || null;
    await item.save();
    return Response(res, 200, { item });
  } catch (e) {
    return Response(res, 500, { reason: e.message });
  }
};
