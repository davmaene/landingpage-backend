// models/Faq.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Faq = sequelize.define('Faq', {
    id:         { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    slug:       { type: DataTypes.STRING(300), allowNull: true },
    question:   { type: DataTypes.STRING(500), allowNull: false },
    questionEn: { type: DataTypes.STRING(500), allowNull: true },
    answer:     { type: DataTypes.TEXT, allowNull: false },
    answerEn:   { type: DataTypes.TEXT, allowNull: true },
    sortOrder:  { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    isActive:   { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    tableName: 'faqs',
    timestamps: true,
  });

  return Faq;
};
