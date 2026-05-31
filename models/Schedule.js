// models/Schedule.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Schedule = sequelize.define('Schedule', {
    id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    type:         { type: DataTypes.ENUM('cours', 'examen'), allowNull: false },
    title:        { type: DataTypes.STRING(255), allowNull: false },
    facultyId:    { type: DataTypes.INTEGER, allowNull: false },
    filiereId:    { type: DataTypes.INTEGER, allowNull: true },
    promotion:    { type: DataTypes.STRING(40), allowNull: false },
    academicYear: { type: DataTypes.STRING(20), allowNull: true },
    semester:     { type: DataTypes.STRING(20), allowNull: true },
    startDate:    { type: DataTypes.DATE, allowNull: true },
    endDate:      { type: DataTypes.DATE, allowNull: true },
    location:     { type: DataTypes.STRING(255), allowNull: true },
    fileUrl:      { type: DataTypes.STRING(500), allowNull: true },
    description:  { type: DataTypes.TEXT, allowNull: true },
    authorId:     { type: DataTypes.INTEGER, allowNull: false },
    status:       { type: DataTypes.ENUM('pending', 'published', 'rejected'), defaultValue: 'pending' },
    publishedAt:  { type: DataTypes.DATE, allowNull: true },
    rejectionReason: { type: DataTypes.TEXT, allowNull: true },
  }, {
    tableName: 'schedules',
    timestamps: true,
  });

  Schedule.associate = (models) => {
    Schedule.belongsTo(models.Faculty, { foreignKey: 'facultyId', as: 'faculty' });
    Schedule.belongsTo(models.Filiere, { foreignKey: 'filiereId', as: 'filiere' });
    Schedule.belongsTo(models.User,    { foreignKey: 'authorId',  as: 'author' });
  };

  return Schedule;
};
