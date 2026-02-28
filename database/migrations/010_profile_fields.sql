-- Migration: 010_profile_fields
-- Adds prefix, suffix, LinkedIn, Calendly, resume URL fields to user profiles

ALTER TABLE users ADD COLUMN IF NOT EXISTS prefix VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS suffix VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_url VARCHAR(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS calendly_url VARCHAR(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS resume_url VARCHAR(500);

CREATE INDEX IF NOT EXISTS idx_users_linkedin ON users (linkedin_url);
