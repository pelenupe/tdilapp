-- Add tagged_users to checkins table and cohort to users table

-- Add cohort column to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS cohort TEXT DEFAULT 'Fall 2024 Cohort';

-- Create checkin_tagged_users table for many-to-many relationship
CREATE TABLE IF NOT EXISTS checkin_tagged_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  checkin_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (checkin_id) REFERENCES checkins(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(checkin_id, user_id)
);

-- Set all existing users to Fall 2024 Cohort
UPDATE users SET cohort = 'Fall 2024 Cohort' WHERE cohort IS NULL;
