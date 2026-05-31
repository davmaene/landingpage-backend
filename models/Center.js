// models/Center.js
const { DataTypes } = require('sequelize');

// ─── Helpers JSON ─────────────────────────────────────────────────────────────
const JSON_FIELDS = ['images', 'direction', 'domaineInterventions', 'etudesRealisees', 'partenaires', 'contacts'];

const serializeCenter = (values) => {
  const out = { ...values };
  JSON_FIELDS.forEach((f) => {
    if (out[f] !== undefined && typeof out[f] !== 'string') out[f] = JSON.stringify(out[f] ?? null);
  });
  return out;
};

const deserializeCenter = (instance) => {
  if (!instance) return instance;
  const obj = instance.toJSON ? instance.toJSON() : { ...instance };
  JSON_FIELDS.forEach((f) => {
    if (typeof obj[f] === 'string') {
      try { obj[f] = JSON.parse(obj[f]); } catch { obj[f] = null; }
    }
  });
  return obj;
};

// ─── Model ────────────────────────────────────────────────────────────────────
module.exports = (sequelize) => {
  const Center = sequelize.define('Center', {
    id:                   { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    slug:                 { type: DataTypes.STRING(160), allowNull: false },
    title:                { type: DataTypes.STRING(200), allowNull: false },
    description:          { type: DataTypes.TEXT, allowNull: false },
    profile:              { type: DataTypes.TEXT('long'), allowNull: true },
    coverImage:           { type: DataTypes.STRING(500), allowNull: true },
    images:               { type: DataTypes.TEXT, allowNull: true },
    direction:            { type: DataTypes.TEXT, allowNull: true },
    domaineInterventions: { type: DataTypes.TEXT, allowNull: true },
    etudesRealisees:      { type: DataTypes.TEXT, allowNull: true },
    partenaires:          { type: DataTypes.TEXT, allowNull: true },
    contacts:             { type: DataTypes.TEXT, allowNull: true },
    facultyId:            { type: DataTypes.INTEGER, allowNull: true },
    authorId:             { type: DataTypes.INTEGER, allowNull: false },
    status:               { type: DataTypes.ENUM('pending', 'published', 'rejected'), defaultValue: 'pending' },
    publishedAt:          { type: DataTypes.DATE, allowNull: true },
    rejectionReason:      { type: DataTypes.TEXT, allowNull: true },
  }, {
    tableName: 'centers',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['slug'], name: 'centers_slug_unique' },
    ],
  });

  Center.associate = (models) => {
    Center.belongsTo(models.Faculty, { foreignKey: 'facultyId', as: 'faculty' });
    Center.belongsTo(models.User,    { foreignKey: 'authorId',  as: 'author' });
  };

  return Center;
};

module.exports.serializeCenter   = serializeCenter;
module.exports.deserializeCenter = deserializeCenter;
