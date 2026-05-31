// models/Newsletter.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Newsletter = sequelize.define('Newsletter', {
    id:       { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    email:    { type: DataTypes.STRING(160), allowNull: false },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    tableName: 'newsletters',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['email'], name: 'newsletters_email_unique' },
    ],
  });

  return Newsletter;
};
