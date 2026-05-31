// models/ContactMessage.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ContactMessage = sequelize.define('ContactMessage', {
    id:      { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name:    { type: DataTypes.STRING(160), allowNull: false },
    email:   { type: DataTypes.STRING(160), allowNull: false },
    subject: { type: DataTypes.STRING(255), allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },
    isRead:  { type: DataTypes.BOOLEAN, defaultValue: false },
  }, {
    tableName: 'contact_messages',
    timestamps: true,
  });

  return ContactMessage;
};
