const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const User = sequelize.define('User', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, unique: true, allowNull: false },
  password: { type: DataTypes.STRING }, // only for email signup
  linkedinId: { type: DataTypes.STRING }, // LinkedIn OAuth
  bio: { type: DataTypes.TEXT },
  profilePicUrl: { type: DataTypes.STRING },
  resumeUrl: { type: DataTypes.STRING },
  role: { 
    type: DataTypes.ENUM('Admin', 'Alumni', 'Employer', 'Intermediary', 'ITA'), 
    defaultValue: 'Alumni'
  },
  points: { type: DataTypes.INTEGER, defaultValue: 0 },
  level: { type: DataTypes.INTEGER, defaultValue: 1 }
}, { timestamps: true });

module.exports = User;
