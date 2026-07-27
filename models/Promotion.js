// models/Promotion.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Promotion = sequelize.define('Promotion', {
    id:        { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name:      { type: DataTypes.STRING(200), allowNull: false },
    facultyId: { type: DataTypes.INTEGER, allowNull: false },
  }, {
    tableName: 'promotions',
    timestamps: true,
  });

  Promotion.associate = (models) => {
    Promotion.belongsTo(models.Faculty, { foreignKey: 'facultyId', as: 'faculty', onDelete: 'CASCADE' });
    Promotion.hasMany(models.Ue, { foreignKey: 'promotionId', as: 'ues', onDelete: 'CASCADE' });
  };

  return Promotion;
};
