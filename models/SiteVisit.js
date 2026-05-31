// models/SiteVisit.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SiteVisit = sequelize.define('SiteVisit', {
    id:        { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    visitorId: { type: DataTypes.STRING(80), allowNull: false }, // identifiant anonyme persistant (localStorage)
    path:      { type: DataTypes.STRING(255), allowNull: true },
    ip:        { type: DataTypes.STRING(45), allowNull: true },
    userAgent: { type: DataTypes.TEXT, allowNull: true },
    referrer:  { type: DataTypes.STRING(500), allowNull: true },
  }, {
    tableName: 'site_visits',
    timestamps: true,
    updatedAt: false,
    indexes: [
      { fields: ['visitorId'], name: 'site_visits_visitor_idx' },
      { fields: ['createdAt'], name: 'site_visits_created_idx' },
    ],
  });

  return SiteVisit;
};
