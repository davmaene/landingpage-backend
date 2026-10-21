// models/Fee.js
// Grille des frais académiques (par promotion / faculté).
// Le champ `total` est TOUJOURS dérivé de la somme des détails de frais.
const { DataTypes } = require('sequelize');

// ─── Helpers JSON ─────────────────────────────────────────────────────────────
const JSON_FIELDS = ['detailsFrais', 'tranches'];

const serializeFee = (values) => {
  const out = { ...values };
  JSON_FIELDS.forEach((f) => {
    if (out[f] !== undefined && out[f] !== null && typeof out[f] !== 'string') {
      out[f] = JSON.stringify(out[f]);
    }
  });
  return out;
};

const deserializeFee = (instance) => {
  if (!instance) return instance;
  const obj = instance.toJSON ? instance.toJSON() : { ...instance };
  JSON_FIELDS.forEach((f) => {
    if (typeof obj[f] === 'string') {
      try { obj[f] = JSON.parse(obj[f]); } catch { obj[f] = null; }
    }
  });
  return obj;
};

// ─── Modèle ───────────────────────────────────────────────────────────────────
module.exports = (sequelize) => {
  const Fee = sequelize.define('Fee', {
    id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    promotion:    { type: DataTypes.STRING(60), allowNull: false, defaultValue: '' },
    faculte:      { type: DataTypes.STRING(255), allowNull: false, defaultValue: '' },
    detailsFrais: { type: DataTypes.TEXT, allowNull: true },
    tranches:     { type: DataTypes.TEXT, allowNull: true },
    total:        { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    academicYear: { type: DataTypes.STRING(20), allowNull: true },
    sortOrder:    { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  }, {
    tableName: 'fees',
    timestamps: true,
  });

  Fee.associate = () => {};

  return Fee;
};

module.exports.serializeFee   = serializeFee;
module.exports.deserializeFee = deserializeFee;
