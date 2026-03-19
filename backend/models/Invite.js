const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Invite = sequelize.define('Invite', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  code: { type: DataTypes.STRING, unique: true, allowNull: false },
  email: { type: DataTypes.STRING },
  isUsed: { type: DataTypes.BOOLEAN, defaultValue: false }
}, { timestamps: true });

module.exports = Invite;
