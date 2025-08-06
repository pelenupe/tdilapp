const { Sequelize } = require('sequelize');
const config = require('../backend/config/database');

// Import all models
const User = require('../backend/models/User');
const Event = require('../backend/models/Event');
const Job = require('../backend/models/Job');
const Message = require('../backend/models/Message');
const Points = require('../backend/models/Points');
const Reward = require('../backend/models/Reward');
const Application = require('../backend/models/Application');
const ContentResource = require('../backend/models/ContentResource');
const Invite = require('../backend/models/Invite');

async function migrate() {
  try {
    console.log('🚀 Starting database migration...');
    
    // Create database connection
    const sequelize = new Sequelize(process.env.DATABASE_URL || config.development.database, {
      dialect: process.env.DB_TYPE === 'postgresql' ? 'postgres' : 'sqlite',
      storage: process.env.DB_TYPE === 'sqlite' ? config.development.storage : undefined,
      logging: console.log,
      dialectOptions: process.env.NODE_ENV === 'production' ? {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      } : {}
    });

    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Initialize models
    const models = {
      User: User(sequelize),
      Event: Event(sequelize),
      Job: Job(sequelize),
      Message: Message(sequelize),
      Points: Points(sequelize),
      Reward: Reward(sequelize),
      Application: Application(sequelize),
      ContentResource: ContentResource(sequelize),
      Invite: Invite(sequelize)
    };

    // Set up associations
    Object.keys(models).forEach(modelName => {
      if (models[modelName].associate) {
        models[modelName].associate(models);
      }
    });

    // Sync all models
    await sequelize.sync({ force: false, alter: true });
    console.log('✅ Database tables synchronized');

    // Close connection
    await sequelize.close();
    console.log('✅ Migration completed successfully');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrate();
}

module.exports = migrate;
