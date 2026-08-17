// models/AdmissionGuide.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AdmissionGuide = sequelize.define('AdmissionGuide', {
    id:             { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    title:          { type: DataTypes.STRING(255), allowNull: false, defaultValue: "Guide d'inscription" },
    academicYear:   { type: DataTypes.STRING(20), allowNull: true },
    introHtml:      { type: DataTypes.TEXT, allowNull: true },
    contentHtml:    { type: DataTypes.TEXT('long'), allowNull: true },
    contactPhones:  { type: DataTypes.STRING(255), allowNull: true },
  }, {
    tableName: 'admission_guide',
    timestamps: true,
  });

  return AdmissionGuide;
};
