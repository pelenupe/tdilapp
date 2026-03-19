-- Migration 014: Organization Profiles
-- Creates a shared org_profiles table so multiple users from the same
-- school/sponsor/employer share one profile record (not per-user).

CREATE TABLE IF NOT EXISTS org_profiles (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  org_type  TEXT    NOT NULL,   -- 'partner_school' | 'sponsor' | 'employer'
  name      TEXT    NOT NULL,   -- org / company name
  description TEXT,
  website   TEXT,
  linkedin_url TEXT,
  logo_url  TEXT,
  contact_name  TEXT,
  contact_email TEXT,
  phone     TEXT,
  -- school-specific extras
  calendly_url    TEXT,
  zoom_url        TEXT,
  materials_url   TEXT,
  intro_video_url TEXT,
  featured  INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Link users to their org
ALTER TABLE users ADD COLUMN org_id INTEGER REFERENCES org_profiles(id);

-- Seed existing partner_school / sponsor / employer users into org_profiles
-- and back-link them (SQLite-compatible: run via JS migration)
