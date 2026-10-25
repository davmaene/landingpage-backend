// models/SiteSetting.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SiteSetting = sequelize.define('SiteSetting', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    key: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    value: { type: DataTypes.TEXT, allowNull: true },
    label: { type: DataTypes.STRING(255), allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
  }, {
    tableName: 'site_settings',
    timestamps: true,
  });
  return SiteSetting;
};
