// models/Attribution.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Attribution = sequelize.define('Attribution', {
    id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    ecId:         { type: DataTypes.INTEGER, allowNull: false },
    teacherId:    { type: DataTypes.INTEGER, allowNull: false },
    academicYear: { type: DataTypes.STRING(50), allowNull: false },
  }, {
    tableName: 'attributions',
    timestamps: true,
  });

  Attribution.associate = (models) => {
    Attribution.belongsTo(models.Ec, { foreignKey: 'ecId', as: 'ec', onDelete: 'CASCADE' });
    Attribution.belongsTo(models.StaffMember, { foreignKey: 'teacherId', as: 'teacher', onDelete: 'CASCADE' });
  };

  return Attribution;
};
