-- Migration: 013_coaching_event_signup
-- Adds coaching URL to user profiles and external signup links to events

ALTER TABLE users ADD COLUMN IF NOT EXISTS coaching_url VARCHAR(500);
ALTER TABLE events ADD COLUMN IF NOT EXISTS signup_url VARCHAR(500);

CREATE INDEX IF NOT EXISTS idx_events_signup_url ON events (signup_url);
