// models/TeacherConfig.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TeacherConfig = sequelize.define('TeacherConfig', {
    id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    teacherId:    { type: DataTypes.INTEGER, allowNull: false },
    academicYear: { type: DataTypes.STRING(50), allowNull: false },
    requiredHours:{ type: DataTypes.INTEGER, allowNull: false, defaultValue: 120 },
  }, {
    tableName: 'teacher_configs',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['teacherId', 'academicYear'], name: 'teacher_academic_year_unique' },
    ],
  });

  TeacherConfig.associate = (models) => {
    TeacherConfig.belongsTo(models.StaffMember, { foreignKey: 'teacherId', as: 'teacher', onDelete: 'CASCADE' });
  };

  return TeacherConfig;
};
