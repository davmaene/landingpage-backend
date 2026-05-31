// models/PasswordResetToken.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PasswordResetToken = sequelize.define('PasswordResetToken', {
    id:        { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId:    { type: DataTypes.INTEGER, allowNull: false },
    token:     { type: DataTypes.STRING(120), allowNull: false },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
    usedAt:    { type: DataTypes.DATE, allowNull: true },
  }, {
    tableName: 'password_reset_tokens',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['token'], name: 'prt_token_unique' },
    ],
  });

  PasswordResetToken.associate = (models) => {
    PasswordResetToken.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  };

  return PasswordResetToken;
};
