// models/Partner.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Partner = sequelize.define('Partner', {
    id:        { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name:      { type: DataTypes.STRING(255), allowNull: false },
    slug:      { type: DataTypes.STRING(255), allowNull: false, unique: true },
    logo:      { type: DataTypes.TEXT, allowNull: true },
    url:       { type: DataTypes.STRING(500), allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    isActive:  { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    tableName: 'partners',
    timestamps: true,
  });

  return Partner;
};
