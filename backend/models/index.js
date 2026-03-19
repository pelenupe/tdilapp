const User = require('./User');
const Invite = require('./Invite');
const Job = require('./Job');
const Application = require('./Application');
const Points = require('./Points');
const Reward = require('./Reward');
const Message = require('./Message');
const Event = require('./Event');
const ContentResource = require('./ContentResource');

// Associations
User.hasMany(Application, { foreignKey: 'userId' });
Application.belongsTo(User, { foreignKey: 'userId' });

Job.hasMany(Application, { foreignKey: 'jobId' });
Application.belongsTo(Job, { foreignKey: 'jobId' });

User.hasMany(Points, { foreignKey: 'userId' });
Points.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Message, { foreignKey: 'senderId' });
User.hasMany(Message, { foreignKey: 'receiverId' });

module.exports = {
  User,
  Invite,
  Job,
  Application,
  Points,
  Reward,
  Message,
  Event,
  ContentResource
};
