const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ContentResource = sequelize.define('ContentResource', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false },
  type: { type: DataTypes.ENUM('PDF', 'Video', 'Podcast', 'Article') },
  url: { type: DataTypes.STRING, allowNull: false }
}, { timestamps: true });

module.exports = ContentResource;
