// models/index.js
// Point d'entrée unique : charge chaque modèle depuis son fichier dédié,
// câble les associations, puis ré-exporte tout.
const sequelize = require('../config/database');

// ─── Chargement des modèles ────────────────────────────────────────────────────
const User               = require('./User')(sequelize);
const Faculty            = require('./Faculty')(sequelize);
const Filiere            = require('./Filiere')(sequelize);
const Content            = require('./Content')(sequelize);
const Newsletter         = require('./Newsletter')(sequelize);
const ContactMessage     = require('./ContactMessage')(sequelize);
const PasswordResetToken = require('./PasswordResetToken')(sequelize);
const Schedule           = require('./Schedule')(sequelize);
const Center             = require('./Center')(sequelize);
const Faq                = require('./Faq')(sequelize);
const StaffMember        = require('./StaffMember')(sequelize);
const SpecialProgram     = require('./SpecialProgram')(sequelize);
const LoginHistory       = require('./LoginHistory')(sequelize);
const SiteVisit          = require('./SiteVisit')(sequelize);
const Promotion         = require('./Promotion')(sequelize);
const Ue                = require('./Ue')(sequelize);
const Ec                = require('./Ec')(sequelize);
const Attribution       = require('./Attribution')(sequelize);
const TeacherConfig     = require('./TeacherConfig')(sequelize);
const KeyFact           = require('./KeyFact')(sequelize);
const Rector            = require('./Rector')(sequelize);
const Partner           = require('./Partner')(sequelize);
const AdmissionGuide    = require('./AdmissionGuide')(sequelize);

// ─── Associations ──────────────────────────────────────────────────────────────
const models = {
  User, Faculty, Filiere, Content, Newsletter,
  ContactMessage, PasswordResetToken, Schedule,
  Center, Faq, StaffMember, SpecialProgram, LoginHistory, SiteVisit,
  Promotion, Ue, Ec, Attribution, TeacherConfig, KeyFact, Rector, Partner,
  AdmissionGuide,
};

Object.values(models).forEach((model) => {
  if (typeof model.associate === 'function') {
    model.associate(models);
  }
});

// ─── Helpers JSON (ré-exportés depuis leurs modèles) ──────────────────────────
const { serializeCenter, deserializeCenter } = require('./Center');
const { serializeStaff,  deserializeStaff  } = require('./StaffMember');

// ─── Exports ───────────────────────────────────────────────────────────────────
module.exports = {
  sequelize,
  ...models,
  serializeCenter, deserializeCenter,
  serializeStaff,  deserializeStaff,
};