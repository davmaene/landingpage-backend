// models/Filiere.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Filiere = sequelize.define('Filiere', {
    id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    facultyId:    { type: DataTypes.INTEGER, allowNull: false },
    name:         { type: DataTypes.STRING(200), allowNull: false },
    nameEn:       { type: DataTypes.STRING(200), allowNull: true },
    slug:         { type: DataTypes.STRING(220), allowNull: false },
    description:  { type: DataTypes.TEXT, allowNull: true },
    descriptionEn:{ type: DataTypes.TEXT, allowNull: true },
    duration:     { type: DataTypes.STRING(50), allowNull: true },
    durationEn:   { type: DataTypes.STRING(50), allowNull: true },
    diploma:      { type: DataTypes.STRING(120), allowNull: true },
    diplomaEn:    { type: DataTypes.STRING(120), allowNull: true },
  }, {
    tableName: 'filieres',
    timestamps: true,
  });

  Filiere.associate = (models) => {
    Filiere.belongsTo(models.Faculty, { foreignKey: 'facultyId', as: 'faculty' });
    Filiere.hasMany(models.Content,   { foreignKey: 'filiereId', as: 'contents' });
  };

  return Filiere;
};
