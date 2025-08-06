const { Sequelize } = require('sequelize');
const config = require('../backend/config/database');
const bcrypt = require('bcrypt');

// Import all models
const User = require('../backend/models/User');
const Event = require('../backend/models/Event');
const Job = require('../backend/models/Job');
const Points = require('../backend/models/Points');
const Reward = require('../backend/models/Reward');

async function seed() {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Create database connection
    const sequelize = new Sequelize(process.env.DATABASE_URL || config.development.database, {
      dialect: process.env.DB_TYPE === 'postgresql' ? 'postgres' : 'sqlite',
      storage: process.env.DB_TYPE === 'sqlite' ? config.development.storage : undefined,
      logging: false,
      dialectOptions: process.env.NODE_ENV === 'production' ? {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      } : {}
    });

    // Initialize models
    const models = {
      User: User(sequelize),
      Event: Event(sequelize),
      Job: Job(sequelize),
      Points: Points(sequelize),
      Reward: Reward(sequelize)
    };

    // Create sample admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await models.User.findOrCreate({
      where: { email: 'admin@tdil.com' },
      defaults: {
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@tdil.com',
        password: hashedPassword,
        role: 'admin',
        isVerified: true,
        points: 1000
      }
    });

    // Create sample events
    const sampleEvents = [
      {
        title: 'Tech Networking Night',
        description: 'Connect with fellow tech professionals in your area',
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
        location: 'Virtual',
        type: 'networking',
        maxAttendees: 50,
        pointsReward: 50
      },
      {
        title: 'Career Development Workshop',
        description: 'Learn essential skills for career advancement',
        date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
        location: 'Chicago, IL',
        type: 'workshop',
        maxAttendees: 30,
        pointsReward: 75
      }
    ];

    for (const eventData of sampleEvents) {
      await models.Event.findOrCreate({
        where: { title: eventData.title },
        defaults: eventData
      });
    }

    // Create sample jobs
    const sampleJobs = [
      {
        title: 'Senior Software Engineer',
        company: 'TechCorp Inc.',
        location: 'Remote',
        type: 'full-time',
        description: 'Looking for an experienced software engineer to join our team',
        requirements: 'Bachelor\'s degree, 5+ years experience',
        salary: '$120,000 - $150,000',
        contactEmail: 'careers@techcorp.com',
        isActive: true
      },
      {
        title: 'Product Manager',
        company: 'StartupXYZ',
        location: 'San Francisco, CA',
        type: 'full-time',
        description: 'Lead product development and strategy',
        requirements: 'MBA preferred, 3+ years PM experience',
        salary: '$130,000 - $160,000',
        contactEmail: 'jobs@startupxyz.com',
        isActive: true
      }
    ];

    for (const jobData of sampleJobs) {
      await models.Job.findOrCreate({
        where: { title: jobData.title, company: jobData.company },
        defaults: jobData
      });
    }

    // Create sample rewards
    const sampleRewards = [
      {
        title: 'Coffee Gift Card',
        description: '$10 Starbucks gift card',
        pointsCost: 100,
        category: 'gift-cards',
        isActive: true,
        quantity: 50
      },
      {
        title: 'Tech Conference Ticket',
        description: 'Free ticket to local tech conference',
        pointsCost: 500,
        category: 'events',
        isActive: true,
        quantity: 10
      },
      {
        title: 'One-on-One Mentorship Session',
        description: '30-minute session with industry expert',
        pointsCost: 300,
        category: 'mentorship',
        isActive: true,
        quantity: 20
      }
    ];

    for (const rewardData of sampleRewards) {
      await models.Reward.findOrCreate({
        where: { title: rewardData.title },
        defaults: rewardData
      });
    }

    console.log('✅ Sample data seeded successfully');
    
    // Close connection
    await sequelize.close();
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seed();
}

module.exports = seed;
