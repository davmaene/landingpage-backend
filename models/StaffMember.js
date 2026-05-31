// models/StaffMember.js
const { DataTypes } = require('sequelize');

// ─── Helpers JSON ─────────────────────────────────────────────────────────────
const STAFF_JSON_FIELDS = ['email', 'phone', 'extra', 'socialLinks'];

const serializeStaff = (values) => {
  const out = { ...values };
  STAFF_JSON_FIELDS.forEach((f) => {
    if (out[f] !== undefined && typeof out[f] !== 'string') out[f] = JSON.stringify(out[f] ?? null);
  });
  return out;
};

const deserializeStaff = (instance) => {
  if (!instance) return instance;
  const obj = instance.toJSON ? instance.toJSON() : { ...instance };
  STAFF_JSON_FIELDS.forEach((f) => {
    if (typeof obj[f] === 'string') {
      try { obj[f] = JSON.parse(obj[f]); } catch { obj[f] = null; }
    }
  });
  return obj;
};

// ─── Model ────────────────────────────────────────────────────────────────────
module.exports = (sequelize) => {
  const StaffMember = sequelize.define('StaffMember', {
    id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    uuid:        { type: DataTypes.STRING(80), allowNull: true },
    slug:        { type: DataTypes.STRING(200), allowNull: false },
    name:        { type: DataTypes.STRING(200), allowNull: false },
    role:        { type: DataTypes.STRING(200), allowNull: false },
    email:       { type: DataTypes.TEXT, allowNull: true },
    phone:       { type: DataTypes.TEXT, allowNull: true },
    image:       { type: DataTypes.STRING(500), allowNull: true },
    isOrganizer: { type: DataTypes.BOOLEAN, defaultValue: false },
    extra:       { type: DataTypes.TEXT, allowNull: true },
    socialLinks: { type: DataTypes.TEXT, allowNull: true },
  }, {
    tableName: 'staff_members',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['slug'], name: 'staff_members_slug_unique' },
    ],
  });

  return StaffMember;
};

module.exports.serializeStaff   = serializeStaff;
module.exports.deserializeStaff = deserializeStaff;
