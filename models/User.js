// models/User.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id:       { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name:     { type: DataTypes.STRING(120), allowNull: false },
    email:    { type: DataTypes.STRING(160), allowNull: false },
    password: { type: DataTypes.STRING(255), allowNull: false },
    role: {
      type: DataTypes.ENUM('super_admin', 'faculty_publisher', 'center_publisher'),
      defaultValue: 'faculty_publisher',
      allowNull: false,
    },
    facultyId: { type: DataTypes.INTEGER, allowNull: true },
    centerId:  { type: DataTypes.INTEGER, allowNull: true },
    staffId:   { type: DataTypes.INTEGER, allowNull: true },
    avatar:    { type: DataTypes.STRING(255), allowNull: true },
    isActive:  { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    tableName: 'users',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['email'], name: 'users_email_unique' },
    ],
  });

  User.associate = (models) => {
    User.belongsTo(models.Faculty, { foreignKey: 'facultyId', as: 'faculty' });
    User.belongsTo(models.Center, { foreignKey: 'centerId', as: 'center' });
    User.belongsTo(models.StaffMember, { foreignKey: 'staffId', as: 'staff' });
    User.hasMany(models.Content, { foreignKey: 'authorId', as: 'contents' });
    User.hasMany(models.LoginHistory, { foreignKey: 'userId', as: 'loginHistory' });
  };

  return User;
};
