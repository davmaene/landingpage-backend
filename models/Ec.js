// models/Ec.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Ec = sequelize.define('Ec', {
    id:      { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    code:    { type: DataTypes.STRING(50), allowNull: false },
    name:    { type: DataTypes.STRING(200), allowNull: false },
    credits: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    ueId:    { type: DataTypes.INTEGER, allowNull: false },
  }, {
    tableName: 'ecs',
    timestamps: true,
  });

  Ec.associate = (models) => {
    Ec.belongsTo(models.Ue, { foreignKey: 'ueId', as: 'ue', onDelete: 'CASCADE' });
    Ec.hasMany(models.Attribution, { foreignKey: 'ecId', as: 'attributions', onDelete: 'CASCADE' });
  };

  return Ec;
};
