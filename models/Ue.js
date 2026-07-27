// models/Ue.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Ue = sequelize.define('Ue', {
    id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    code:        { type: DataTypes.STRING(50), allowNull: false },
    name:        { type: DataTypes.STRING(200), allowNull: false },
    promotionId: { type: DataTypes.INTEGER, allowNull: false },
  }, {
    tableName: 'ues',
    timestamps: true,
  });

  Ue.associate = (models) => {
    Ue.belongsTo(models.Promotion, { foreignKey: 'promotionId', as: 'promotion', onDelete: 'CASCADE' });
    Ue.hasMany(models.Ec, { foreignKey: 'ueId', as: 'ecs', onDelete: 'CASCADE' });
  };

  return Ue;
};
