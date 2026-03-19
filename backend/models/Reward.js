const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Reward = sequelize.define('Reward', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  cost: { type: DataTypes.INTEGER, allowNull: false },
  description: { type: DataTypes.TEXT }
}, { timestamps: true });

module.exports = Reward;
