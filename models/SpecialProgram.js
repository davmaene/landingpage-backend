// models/SpecialProgram.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SpecialProgram = sequelize.define('SpecialProgram', {
    id:            { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    facultyId:     { type: DataTypes.INTEGER, allowNull: false },
    name:          { type: DataTypes.STRING(200), allowNull: false },
    nameEn:        { type: DataTypes.STRING(200), allowNull: true },
    slug:          { type: DataTypes.STRING(220), allowNull: false },
    description:   { type: DataTypes.TEXT('long'), allowNull: true },
    descriptionEn: { type: DataTypes.TEXT('long'), allowNull: true },
    coverImage:    { type: DataTypes.STRING(500), allowNull: true },
    isActive:      { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    tableName: 'special_programs',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['slug'], name: 'special_programs_slug_unique' },
    ],
  });

  SpecialProgram.associate = (models) => {
    SpecialProgram.belongsTo(models.Faculty, { foreignKey: 'facultyId', as: 'faculty' });
    SpecialProgram.hasMany(models.Content,   { foreignKey: 'specialProgramId', as: 'contents' });
  };

  return SpecialProgram;
};
