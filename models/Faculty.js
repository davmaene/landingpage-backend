// models/Faculty.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Faculty = sequelize.define('Faculty', {
    id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name:        { type: DataTypes.STRING(200), allowNull: false },
    nameEn:      { type: DataTypes.STRING(200), allowNull: true },
    slug:        { type: DataTypes.STRING(220), allowNull: false },
    domaine:     { type: DataTypes.STRING(200), allowNull: false },
    domaineEn:   { type: DataTypes.STRING(200), allowNull: true },
    description:   { type: DataTypes.TEXT('long'), allowNull: true },
    descriptionEn: { type: DataTypes.TEXT('long'), allowNull: true },
    dean:          { type: DataTypes.STRING(200), allowNull: true },
    deanEn:        { type: DataTypes.STRING(200), allowNull: true },
    secretary:     { type: DataTypes.STRING(200), allowNull: true },
    secretaryEn:   { type: DataTypes.STRING(200), allowNull: true },
    deanStaffId:      { type: DataTypes.INTEGER, allowNull: true },
    secretaryStaffId: { type: DataTypes.INTEGER, allowNull: true },
    coverImage:    { type: DataTypes.STRING(500), allowNull: true },
  }, {
    tableName: 'faculties',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['slug'], name: 'faculties_slug_unique' },
    ],
  });

  Faculty.associate = (models) => {
    Faculty.hasMany(models.Filiere,        { foreignKey: 'facultyId', as: 'filieres',       onDelete: 'CASCADE' });
    Faculty.hasMany(models.User,           { foreignKey: 'facultyId', as: 'publishers' });
    Faculty.hasMany(models.SpecialProgram, { foreignKey: 'facultyId', as: 'specialPrograms', onDelete: 'CASCADE' });
    Faculty.hasMany(models.Schedule,       { foreignKey: 'facultyId', as: 'schedules' });
    Faculty.belongsTo(models.StaffMember,  { foreignKey: 'deanStaffId',      as: 'deanStaff' });
    Faculty.belongsTo(models.StaffMember,  { foreignKey: 'secretaryStaffId', as: 'secretaryStaff' });
  };

  return Faculty;
};
