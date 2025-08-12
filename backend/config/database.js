const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');

// Database connection based on environment
let db;
let isPostgreSQL = false;

if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('postgresql://')) {
  // PostgreSQL for production
  isPostgreSQL = true;
  db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: false
    } : false
  });
  console.log('🐘 Using PostgreSQL database');
} else {
  // SQLite for development
  const dbPath = path.join(__dirname, '../database.sqlite');
  db = new sqlite3.Database(dbPath);
  console.log('📄 Using SQLite database');
}

// Unified query function
const query = async (sql, params = []) => {
  if (isPostgreSQL) {
    try {
      const result = await db.query(sql, params);
      return result.rows;
    } catch (error) {
      throw error;
    }
  } else {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
};

// Initialize database tables
const initDatabase = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Users table
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        firstName TEXT NOT NULL,
        lastName TEXT NOT NULL,
        company TEXT,
        jobTitle TEXT,
        location TEXT,
        linkedinUrl TEXT,
        profileImage TEXT,
        points INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1,
        userType TEXT DEFAULT 'member',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Add userType column if it doesn't exist
      db.run(`ALTER TABLE users ADD COLUMN userType TEXT DEFAULT 'member'`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding userType column:', err);
        }
      });

      // Events table
      db.run(`CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        date DATETIME NOT NULL,
        location TEXT,
        points INTEGER DEFAULT 0,
        maxAttendees INTEGER,
        imageUrl TEXT,
        category TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Jobs table
      db.run(`CREATE TABLE IF NOT EXISTS jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        company TEXT NOT NULL,
        description TEXT,
        location TEXT,
        jobType TEXT,
        points INTEGER DEFAULT 0,
        requirements TEXT,
        benefits TEXT,
        salaryRange TEXT,
        postedBy INTEGER,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (postedBy) REFERENCES users (id)
      )`);

      // Announcements table
      db.run(`CREATE TABLE IF NOT EXISTS announcements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT,
        featured BOOLEAN DEFAULT 0,
        points INTEGER DEFAULT 0,
        imageUrl TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // User Points History
      db.run(`CREATE TABLE IF NOT EXISTS points_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        points INTEGER NOT NULL,
        reason TEXT,
        type TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users (id)
      )`);

      // Connections table
      db.run(`CREATE TABLE IF NOT EXISTS connections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId1 INTEGER NOT NULL,
        userId2 INTEGER NOT NULL,
        status TEXT DEFAULT 'pending',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId1) REFERENCES users (id),
        FOREIGN KEY (userId2) REFERENCES users (id)
      )`);

      // Messages table
      db.run(`CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        senderId INTEGER NOT NULL,
        receiverId INTEGER NOT NULL,
        content TEXT NOT NULL,
        read BOOLEAN DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (senderId) REFERENCES users (id),
        FOREIGN KEY (receiverId) REFERENCES users (id)
      )`);

      // Rewards table
      db.run(`CREATE TABLE IF NOT EXISTS rewards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        pointsCost INTEGER NOT NULL,
        category TEXT,
        quantity INTEGER DEFAULT 1,
        isActive BOOLEAN DEFAULT 1,
        imageUrl TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      console.log('Database tables initialized successfully');
      resolve();
    });
  });
};

// Insert sample data
const insertSampleData = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Sample users
      const users = [
        // Regular members
        ['demo@tdil.com', 'demo123', 'Demo', 'User', 'tDIL', 'Member', 'Indianapolis, IN', 'https://linkedin.com/in/demo', null, 2450, 4, 'member'],
        ['michael.johnson@example.com', 'password123', 'Michael', 'Johnson', 'Eli Lilly and Company', 'Director of Innovation', 'Indianapolis, IN', 'https://linkedin.com/in/mjohnson', null, 4582, 8, 'member'],
        ['sarah.williams@example.com', 'password123', 'Sarah', 'Williams', 'Salesforce', 'VP of Marketing', 'Indianapolis, IN', 'https://linkedin.com/in/swilliams', null, 3845, 7, 'member'],
        ['david.chen@example.com', 'password123', 'David', 'Chen', 'TechNova Solutions', 'CTO', 'Chicago, IL', 'https://linkedin.com/in/dchen', null, 3210, 6, 'member'],
        ['emma.rodriguez@example.com', 'password123', 'Emma', 'Rodriguez', 'tDIL', 'Community Manager', 'Indianapolis, IN', 'https://linkedin.com/in/erodriguez', null, 2987, 5, 'member'],
        ['james.wilson@example.com', 'password123', 'James', 'Wilson', 'Microsoft', 'Product Manager', 'New York, NY', 'https://linkedin.com/in/jwilson', null, 2758, 5, 'member'],
        
        // Partner schools
        ['purdue@tdil.com', 'school123', 'Sarah', 'Mitchell', 'Purdue University', 'Career Services Director', 'West Lafayette, IN', 'https://linkedin.com/in/smitchell', null, 0, 1, 'partner_school'],
        ['iu@tdil.com', 'school123', 'Mark', 'Thompson', 'Indiana University', 'Alumni Relations Manager', 'Bloomington, IN', 'https://linkedin.com/in/mthompson', null, 0, 1, 'partner_school'],
        ['butler@tdil.com', 'school123', 'Lisa', 'Johnson', 'Butler University', 'Student Success Coordinator', 'Indianapolis, IN', 'https://linkedin.com/in/ljohnson', null, 0, 1, 'partner_school'],
        
        // Sponsors
        ['sponsor@tdil.com', 'sponsor123', 'Robert', 'Davis', 'Tech Innovators Inc', 'Partnership Manager', 'Indianapolis, IN', 'https://linkedin.com/in/rdavis', null, 0, 1, 'sponsor'],
        ['lilly@tdil.com', 'sponsor123', 'Jennifer', 'Adams', 'Eli Lilly and Company', 'Community Engagement Lead', 'Indianapolis, IN', 'https://linkedin.com/in/jadams', null, 0, 1, 'sponsor'],
        ['salesforce@tdil.com', 'sponsor123', 'Kevin', 'Brown', 'Salesforce', 'Corporate Relations Director', 'San Francisco, CA', 'https://linkedin.com/in/kbrown', null, 0, 1, 'sponsor']
      ];

      const stmt = db.prepare(`INSERT OR IGNORE INTO users (email, password, firstName, lastName, company, jobTitle, location, linkedinUrl, profileImage, points, level, userType) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
      users.forEach(user => stmt.run(user));
      stmt.finalize();

      // Sample events
      const events = [
        ['Spring Networking Mixer', 'Connect with professionals from various industries and expand your network', '2025-04-28 18:00:00', 'The Amp, Indianapolis', 100, 50, null, 'Networking'],
        ['Eli Lilly Partnership Launch', 'Celebrate our new partnership with Eli Lilly', '2025-04-25 13:00:00', 'Eli Lilly HQ, Indianapolis', 200, 100, null, 'Partnership'],
        ['Virtual Career Fair', 'Explore career opportunities with our partner companies', '2025-04-11 09:00:00', 'Online Platform', 100, 200, null, 'Career'],
        ['Resume Workshop', 'Learn how to craft the perfect resume', '2025-05-05 12:00:00', 'Zoom Webinar', 75, 30, null, 'Workshop'],
        ['Leadership Summit 2025', 'Annual leadership development event', '2025-04-23 08:00:00', 'The Amp, Indianapolis', 200, 75, null, 'Leadership']
      ];

      const eventStmt = db.prepare(`INSERT OR IGNORE INTO events (title, description, date, location, points, maxAttendees, imageUrl, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
      events.forEach(event => eventStmt.run(event));
      eventStmt.finalize();

      // Sample announcements
      const announcements = [
        ['Strategic Partnership with Eli Lilly Expands Career Opportunities', 'We\'re thrilled to announce our new strategic partnership with Eli Lilly that will create exclusive career pathways, mentorship opportunities, and specialized training programs for our members.', 'Partnership', 1, 200, null],
        ['Summer Networking Series at The Amp', 'Join us for our Summer Networking Series at The Amp. Each event is worth 100 points, with bonus points for bringing new connections.', 'Event', 0, 100, null],
        ['New Reward Tiers and Exclusive Benefits', 'We\'ve updated our rewards program with exclusive merchandise, event tickets, and mentorship opportunities.', 'Program Update', 0, 0, null]
      ];

      const announcementStmt = db.prepare(`INSERT OR IGNORE INTO announcements (title, content, category, featured, points, imageUrl) VALUES (?, ?, ?, ?, ?, ?)`);
      announcements.forEach(announcement => announcementStmt.run(announcement));
      announcementStmt.finalize();

      // Sample jobs
      const jobs = [
        ['Senior Product Manager', 'Eli Lilly', 'Lead product strategy and execution for our digital health initiatives. Work with cross-functional teams to deliver innovative solutions that improve patient outcomes.', 'Indianapolis, IN', 'Full-time', 150, 'Product management experience, Healthcare background, Leadership skills', 'Competitive salary, Health benefits, Stock options', '$120,000 - $160,000', 1],
        ['UX Designer', 'Salesforce', 'Create intuitive and engaging user experiences for our enterprise products. Collaborate with product managers and engineers to deliver human-centered design solutions.', 'Remote', 'Full-time', 125, 'UX/UI design experience, Figma proficiency, User research skills', 'Remote work, Design budget, Professional development', '$90,000 - $130,000', 2],
        ['Marketing Manager', 'Adobe', 'Develop and execute marketing strategies to drive growth and engagement for our creative products.', 'Indianapolis, IN', 'Full-time', 100, 'Marketing experience, Creative background, Analytics skills', 'Creative environment, Learning budget, Flexible hours', '$80,000 - $110,000', 3]
      ];

      const jobStmt = db.prepare(`INSERT OR IGNORE INTO jobs (title, company, description, location, jobType, points, requirements, benefits, salaryRange, postedBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
      jobs.forEach(job => jobStmt.run(job));
      jobStmt.finalize();

      // Sample rewards
      const rewards = [
        ['Coffee Gift Card', '$10 Starbucks gift card', 100, 'gift-cards', 50, 1, null],
        ['Tech Conference Ticket', 'Free ticket to local tech conference', 500, 'events', 10, 1, null],
        ['One-on-One Mentorship Session', '30-minute session with industry expert', 300, 'mentorship', 20, 1, null],
        ['Amazon Gift Card ($25)', '$25 Amazon gift card', 250, 'gift-cards', 30, 1, null],
        ['LinkedIn Premium (1 Month)', '1 month of LinkedIn Premium access', 200, 'professional', 25, 1, null],
        ['tDIL Hoodie', 'Official tDIL branded hoodie', 400, 'merchandise', 15, 1, null],
        ['Career Coaching Session', '60-minute career coaching session', 600, 'mentorship', 8, 1, null],
        ['Book Club Membership', '3-month book club membership', 150, 'learning', 40, 1, null]
      ];

      const rewardStmt = db.prepare(`INSERT OR IGNORE INTO rewards (title, description, pointsCost, category, quantity, isActive, imageUrl) VALUES (?, ?, ?, ?, ?, ?, ?)`);
      rewards.forEach(reward => rewardStmt.run(reward));
      rewardStmt.finalize();

      console.log('Sample data inserted successfully');
      resolve();
    });
  });
};

module.exports = {
  db,
  query,
  isPostgreSQL,
  initDatabase,
  insertSampleData
};
