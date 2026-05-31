// models/Content.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Content = sequelize.define('Content', {
    id:               { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    type:             { type: DataTypes.ENUM('article', 'event', 'activity'), allowNull: false },
    title:            { type: DataTypes.STRING(255), allowNull: false },
    slug:             { type: DataTypes.STRING(280), allowNull: false },
    excerpt:          { type: DataTypes.TEXT, allowNull: true },
    content:          { type: DataTypes.TEXT('long'), allowNull: false },
    category:         { type: DataTypes.STRING(120), allowNull: true },
    coverImage:       { type: DataTypes.STRING(500), allowNull: true },
    eventDate:        { type: DataTypes.DATE, allowNull: true },
    location:         { type: DataTypes.STRING(255), allowNull: true },
    authorId:         { type: DataTypes.INTEGER, allowNull: false },
    facultyId:        { type: DataTypes.INTEGER, allowNull: true },
    filiereId:        { type: DataTypes.INTEGER, allowNull: true },
    specialProgramId: { type: DataTypes.INTEGER, allowNull: true },
    status: {
      type: DataTypes.ENUM('draft', 'pending', 'published', 'rejected'),
      defaultValue: 'pending',
      allowNull: false,
    },
    rejectionReason: { type: DataTypes.TEXT, allowNull: true },
    publishedAt:     { type: DataTypes.DATE, allowNull: true },
    views:           { type: DataTypes.INTEGER, defaultValue: 0 },
  }, {
    tableName: 'contents',
    timestamps: true,
  });

  Content.associate = (models) => {
    Content.belongsTo(models.User,          { foreignKey: 'authorId',         as: 'author' });
    Content.belongsTo(models.Faculty,       { foreignKey: 'facultyId',        as: 'faculty' });
    Content.belongsTo(models.Filiere,       { foreignKey: 'filiereId',        as: 'filiere' });
    Content.belongsTo(models.SpecialProgram,{ foreignKey: 'specialProgramId', as: 'specialProgram' });
  };

  return Content;
};
