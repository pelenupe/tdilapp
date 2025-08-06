const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Event = sequelize.define('Event', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  eventDate: { type: DataTypes.DATE, allowNull: false },
  location: { type: DataTypes.STRING }
}, { timestamps: true });

module.exports = Event;
