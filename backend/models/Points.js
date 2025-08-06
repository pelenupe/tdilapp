const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Points = sequelize.define('Points', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  amount: { type: DataTypes.INTEGER, allowNull: false },
  action: { type: DataTypes.STRING } // e.g. "Profile Completion", "Job Application"
}, { timestamps: true });

module.exports = Points;
