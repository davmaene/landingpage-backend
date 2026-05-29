const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const slugify = require('slugify');
const { Faculty, Filiere, Content, Newsletter, ContactMessage, User, Schedule, Faq, Center, StaffMember, serializeStaff, deserializeStaff } = require('../models');
const { sendMail } = require('../utils/mailer');
const { Response } = require('../utils/Response');

const facultyIncludes = [{ model: Filiere, as: 'filieres' }];

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
  const items = await Faculty.findAll({ include: [{ model: Filiere, as: 'filieres' }], order: [['name', 'ASC']] });
  return Response(res, 200, { length: items.length, rows: items });
};

exports.getFaculty = async (req, res) => {
  const item = await Faculty.findOne({ where: { slug: req.params.slug }, include: [{ model: Filiere, as: 'filieres' }] });
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
      dean, deanEn, secretary, secretaryEn, coverImage, filieres,
    } = req.body;
    if (!name?.trim() || !domaine?.trim())
      return Response(res, 401, { reason: 'Nom et domaine requis' });
    const slug = await uniqueFacultySlug(name.trim());
    const faculty = await Faculty.create({
      name: name.trim(),
      nameEn: nameEn?.trim() || null,
      slug,
      domaine: domaine.trim(),
      domaineEn: domaineEn?.trim() || null,
      description: description || null,
      descriptionEn: descriptionEn || null,
      dean: dean || null,
      deanEn: deanEn || null,
      secretary: secretary || null,
      secretaryEn: secretaryEn || null,
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
      dean, deanEn, secretary, secretaryEn, coverImage, filieres,
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
    if (dean !== undefined) faculty.dean = dean || null;
    if (deanEn !== undefined) faculty.deanEn = deanEn || null;
    if (secretary !== undefined) faculty.secretary = secretary || null;
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

// ---------------- Search ----------------
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

// ---------------- Newsletter ----------------
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

// ---------------- Contact ----------------
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

  const [faculties, filieres, centers, faqs, personnel, domaines, categories] = await Promise.all([
    Faculty.count(),
    Filiere.count(),
    Center.count(),
    Faq.count(),
    StaffMember.count(),
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
    domaines,
    categories,
    keyFigures: 0,
  });
};

// ---------------- Users ----------------
exports.listUsers = async (req, res) => {
  const items = await User.findAll({
    attributes: { exclude: ['password'] },
    include: [{ model: Faculty, as: 'faculty' }],
    order: [['createdAt', 'DESC']],
  });
  return Response(res, 200, { length: items.length, rows: items });
};

exports.updateUser = async (req, res) => {
  try {
    const u = await User.findByPk(req.params.id);
    if (!u) return Response(res, 404, { reason: 'Utilisateur introuvable' });
    const { name, email, role, facultyId, isActive, password } = req.body;
    if (name !== undefined) u.name = String(name).trim();
    if (email !== undefined) {
      const normalized = String(email).toLowerCase().trim();
      const exists = await User.findOne({ where: { email: normalized, id: { [Op.ne]: u.id } } });
      if (exists) return Response(res, 405, { reason: 'Email déjà utilisé' });
      u.email = normalized;
    }
    if (role !== undefined) {
      u.role = role === 'super_admin' ? 'super_admin' : 'faculty_publisher';
    }
    if (facultyId !== undefined) u.facultyId = facultyId || null;
    if (isActive !== undefined) u.isActive = !!isActive;
    if (password) {
      if (password.length < 6) return Response(res, 405, { reason: 'Mot de passe trop court (min 6)' });
      u.password = await bcrypt.hash(password, 10);
    }
    if (u.role === 'faculty_publisher' && !u.facultyId)
      return Response(res, 401, { reason: 'Une faculté est requise pour un publieur' });
    await u.save();
    const safe = await User.findByPk(u.id, {
      attributes: { exclude: ['password'] },
      include: [{ model: Faculty, as: 'faculty' }],
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

// ---------------- Staff ----------------
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
    const { name, role, email, phone, image, isOrganizer, extra, socialLinks } = req.body;
    if (!name?.trim() || !role?.trim())
      return Response(res, 401, { reason: 'Nom et rôle requis' });
    const slug = await uniqueStaffSlug(name.trim());
    const payload = serializeStaff({
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
