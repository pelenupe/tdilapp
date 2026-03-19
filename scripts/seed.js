const { Pool } = require('pg');
const { insertSampleData } = require('../backend/config/database');

async function seed() {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Check if we're using PostgreSQL or SQLite
    if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('postgresql://')) {
      console.log('📊 Using PostgreSQL database...');
      await seedPostgreSQL();
    } else {
      console.log('📊 Using SQLite database...');
      await seedSQLite();
    }
    
    console.log('✅ Database seeded successfully');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
}

async function seedPostgreSQL() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: false
    } : false
  });

  try {
    // Sample users
    const users = [
      // Regular members
      ['demo@tdil.com', 'demo123', 'Demo', 'User', 'tDIL', 'Member', 'Indianapolis, IN', 'https://linkedin.com/in/demo', null, 2450, 4, 'member'],
      ['michael.johnson@example.com', 'password123', 'Michael', 'Johnson', 'Eli Lilly and Company', 'Director of Innovation', 'Indianapolis, IN', 'https://linkedin.com/in/mjohnson', null, 4582, 8, 'member'],
      ['sarah.williams@example.com', 'password123', 'Sarah', 'Williams', 'Salesforce', 'VP of Marketing', 'Indianapolis, IN', 'https://linkedin.com/in/swilliams', null, 3845, 7, 'member'],
      ['david.chen@example.com', 'password123', 'David', 'Chen', 'TechNova Solutions', 'CTO', 'Chicago, IL', 'https://linkedin.com/in/dchen', null, 3210, 6, 'member'],
      
      // Partner schools
      ['purdue@tdil.com', 'school123', 'Sarah', 'Mitchell', 'Purdue University', 'Career Services Director', 'West Lafayette, IN', 'https://linkedin.com/in/smitchell', null, 0, 1, 'partner_school'],
      ['iu@tdil.com', 'school123', 'Mark', 'Thompson', 'Indiana University', 'Alumni Relations Manager', 'Bloomington, IN', 'https://linkedin.com/in/mthompson', null, 0, 1, 'partner_school'],
      
      // Sponsors
      ['sponsor@tdil.com', 'sponsor123', 'Robert', 'Davis', 'Tech Innovators Inc', 'Partnership Manager', 'Indianapolis, IN', 'https://linkedin.com/in/rdavis', null, 0, 1, 'sponsor'],
      ['lilly@tdil.com', 'sponsor123', 'Jennifer', 'Adams', 'Eli Lilly and Company', 'Community Engagement Lead', 'Indianapolis, IN', 'https://linkedin.com/in/jadams', null, 0, 1, 'sponsor']
    ];

    // Insert users
    for (const user of users) {
      try {
        await pool.query(`
          INSERT INTO users (email, password, "firstName", "lastName", company, "jobTitle", location, "linkedinUrl", "profileImage", points, level, "userType") 
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (email) DO NOTHING
        `, user);
      } catch (err) {
        if (!err.message.includes('duplicate key')) {
          throw err;
        }
      }
    }

    // Sample events
    const events = [
      ['Spring Networking Mixer', 'Connect with professionals from various industries and expand your network', '2025-04-28 18:00:00', 'The Amp, Indianapolis', 100, 50, null, 'Networking'],
      ['Eli Lilly Partnership Launch', 'Celebrate our new partnership with Eli Lilly', '2025-04-25 13:00:00', 'Eli Lilly HQ, Indianapolis', 200, 100, null, 'Partnership'],
      ['Virtual Career Fair', 'Explore career opportunities with our partner companies', '2025-04-11 09:00:00', 'Online Platform', 100, 200, null, 'Career'],
      ['Resume Workshop', 'Learn how to craft the perfect resume', '2025-05-05 12:00:00', 'Zoom Webinar', 75, 30, null, 'Workshop'],
      ['Leadership Summit 2025', 'Annual leadership development event', '2025-04-23 08:00:00', 'The Amp, Indianapolis', 200, 75, null, 'Leadership']
    ];

    for (const event of events) {
      try {
        await pool.query(`
          INSERT INTO events (title, description, date, location, points, "maxAttendees", "imageUrl", category) 
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT DO NOTHING
        `, event);
      } catch (err) {
        // Continue if already exists
        console.log(`Event "${event[0]}" already exists or error:`, err.message);
      }
    }

    // Sample jobs
    const jobs = [
      ['Senior Product Manager', 'Eli Lilly', 'Lead product strategy and execution for our digital health initiatives. Work with cross-functional teams to deliver innovative solutions that improve patient outcomes.', 'Indianapolis, IN', 'Full-time', 150, 'Product management experience, Healthcare background, Leadership skills', 'Competitive salary, Health benefits, Stock options', '$120,000 - $160,000', 1],
      ['UX Designer', 'Salesforce', 'Create intuitive and engaging user experiences for our enterprise products. Collaborate with product managers and engineers to deliver human-centered design solutions.', 'Remote', 'Full-time', 125, 'UX/UI design experience, Figma proficiency, User research skills', 'Remote work, Design budget, Professional development', '$90,000 - $130,000', 2],
      ['Marketing Manager', 'Adobe', 'Develop and execute marketing strategies to drive growth and engagement for our creative products.', 'Indianapolis, IN', 'Full-time', 100, 'Marketing experience, Creative background, Analytics skills', 'Creative environment, Learning budget, Flexible hours', '$80,000 - $110,000', 1]
    ];

    for (const job of jobs) {
      try {
        await pool.query(`
          INSERT INTO jobs (title, company, description, location, "jobType", points, requirements, benefits, "salaryRange", "postedBy") 
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, job);
      } catch (err) {
        console.log(`Job "${job[0]}" error:`, err.message);
      }
    }

    // Sample rewards - cleared for production
    // Rewards will be added by admins through the admin interface
    console.log('⏭️  Skipping sample rewards - will be managed by admins');

    console.log('✅ PostgreSQL sample data inserted successfully');
    
  } finally {
    await pool.end();
  }
}

async function seedSQLite() {
  // Use the existing SQLite sample data insertion
  await insertSampleData();
  console.log('✅ SQLite sample data inserted successfully');
}

// Run seed if this file is executed directly
if (require.main === module) {
  seed();
}

module.exports = seed;
