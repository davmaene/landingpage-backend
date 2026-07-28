// models/Rector.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Rector = sequelize.define('Rector', {
    id:        { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name:      { type: DataTypes.STRING(255), allowNull: false },
    slug:      { type: DataTypes.STRING(255), allowNull: false, unique: true },
    startYear: { type: DataTypes.INTEGER, allowNull: false },
    endYear:   { type: DataTypes.INTEGER, allowNull: true },
    image:     { type: DataTypes.TEXT, allowNull: true },
    bio:       { type: DataTypes.TEXT, allowNull: true },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    isActive:  { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    tableName: 'rectors',
    timestamps: true,
  });

  return Rector;
};
