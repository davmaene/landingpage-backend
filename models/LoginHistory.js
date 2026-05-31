// models/LoginHistory.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const LoginHistory = sequelize.define('LoginHistory', {
    id:         { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId:     { type: DataTypes.INTEGER, allowNull: true },
    email:      { type: DataTypes.STRING(160), allowNull: false },
    status:     { type: DataTypes.ENUM('success', 'failed', 'disabled'), allowNull: false },
    failReason: { type: DataTypes.STRING(50), allowNull: true }, // bad_credentials | unknown_email | account_disabled
    ip:         { type: DataTypes.STRING(45), allowNull: true },
    userAgent:  { type: DataTypes.TEXT, allowNull: true },
  }, {
    tableName: 'login_history',
    timestamps: true,
    updatedAt: false,
  });

  LoginHistory.associate = (models) => {
    LoginHistory.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  };

  return LoginHistory;
};
