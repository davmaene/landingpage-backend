// models/KeyFact.js
const {
  DataTypes
} = require('sequelize');

module.exports = (sequelize) => {
  const KeyFact = sequelize.define('KeyFact', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    titleEn: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    value: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
  }, {
    tableName: 'key_facts',
    timestamps: true,
  });

  return KeyFact;
};