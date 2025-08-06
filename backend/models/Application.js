const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Application = sequelize.define('Application', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  jobId: { type: DataTypes.UUID, allowNull: false },
  status: { 
    type: DataTypes.ENUM('Pending', 'Viewed', 'Interview', 'Offer', 'Rejected'), 
    defaultValue: 'Pending' 
  }
}, { timestamps: true });

module.exports = Application;
