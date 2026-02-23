-- Migration: Sponsor check-ins MVP
-- Compatible with both SQLite and PostgreSQL by using app-side execution logic.

-- ----------------------------
-- SQLite section
-- ----------------------------

CREATE TABLE IF NOT EXISTS sponsors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'bronze',
  user_id INTEGER,
  points_earned INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_sponsors_user_id ON sponsors(user_id);
CREATE INDEX IF NOT EXISTS idx_sponsors_tier ON sponsors(tier);

CREATE TABLE IF NOT EXISTS sponsor_locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sponsor_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  google_place_id TEXT,
  latitude REAL,
  longitude REAL,
  radius_meters INTEGER DEFAULT 150,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (sponsor_id) REFERENCES sponsors(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sponsor_locations_place_id_unique
  ON sponsor_locations(google_place_id)
  WHERE google_place_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sponsor_locations_sponsor_id ON sponsor_locations(sponsor_id);

CREATE TABLE IF NOT EXISTS sponsor_checkins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  checkin_id INTEGER NOT NULL,
  sponsor_id INTEGER NOT NULL,
  sponsor_location_id INTEGER,
  user_id INTEGER NOT NULL,
  tier TEXT NOT NULL,
  user_bonus_points INTEGER NOT NULL DEFAULT 0,
  sponsor_points_awarded INTEGER NOT NULL DEFAULT 0,
  validation_method TEXT DEFAULT 'place_id',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (checkin_id) REFERENCES checkins(id) ON DELETE CASCADE,
  FOREIGN KEY (sponsor_id) REFERENCES sponsors(id) ON DELETE CASCADE,
  FOREIGN KEY (sponsor_location_id) REFERENCES sponsor_locations(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(checkin_id)
);

CREATE INDEX IF NOT EXISTS idx_sponsor_checkins_user_id ON sponsor_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_checkins_sponsor_id ON sponsor_checkins(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_checkins_created_at ON sponsor_checkins(created_at);

ALTER TABLE checkins ADD COLUMN latitude REAL;
ALTER TABLE checkins ADD COLUMN longitude REAL;
ALTER TABLE checkins ADD COLUMN google_place_id TEXT;
ALTER TABLE checkins ADD COLUMN sponsor_id INTEGER;
ALTER TABLE checkins ADD COLUMN sponsor_location_id INTEGER;
ALTER TABLE checkins ADD COLUMN points_awarded INTEGER DEFAULT 0;
ALTER TABLE checkins ADD COLUMN sponsor_bonus_points INTEGER DEFAULT 0;


-- ----------------------------
-- PostgreSQL section (executed by custom migration runner)
-- ----------------------------
-- PG_ONLY_START

CREATE TABLE IF NOT EXISTS sponsors (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  tier VARCHAR(20) NOT NULL DEFAULT 'bronze',
  user_id INTEGER REFERENCES users(id),
  points_earned INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sponsors_user_id ON sponsors(user_id);
CREATE INDEX IF NOT EXISTS idx_sponsors_tier ON sponsors(tier);

CREATE TABLE IF NOT EXISTS sponsor_locations (
  id SERIAL PRIMARY KEY,
  sponsor_id INTEGER NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  address VARCHAR(500),
  google_place_id VARCHAR(255),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  radius_meters INTEGER DEFAULT 150,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sponsor_locations_place_id_unique
  ON sponsor_locations(google_place_id)
  WHERE google_place_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sponsor_locations_sponsor_id ON sponsor_locations(sponsor_id);

CREATE TABLE IF NOT EXISTS sponsor_checkins (
  id SERIAL PRIMARY KEY,
  checkin_id INTEGER NOT NULL REFERENCES checkins(id) ON DELETE CASCADE,
  sponsor_id INTEGER NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,
  sponsor_location_id INTEGER REFERENCES sponsor_locations(id) ON DELETE SET NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier VARCHAR(20) NOT NULL,
  user_bonus_points INTEGER NOT NULL DEFAULT 0,
  sponsor_points_awarded INTEGER NOT NULL DEFAULT 0,
  validation_method VARCHAR(50) DEFAULT 'place_id',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(checkin_id)
);

CREATE INDEX IF NOT EXISTS idx_sponsor_checkins_user_id ON sponsor_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_checkins_sponsor_id ON sponsor_checkins(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_checkins_created_at ON sponsor_checkins(created_at);

ALTER TABLE checkins ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE checkins ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE checkins ADD COLUMN IF NOT EXISTS google_place_id VARCHAR(255);
ALTER TABLE checkins ADD COLUMN IF NOT EXISTS sponsor_id INTEGER;
ALTER TABLE checkins ADD COLUMN IF NOT EXISTS sponsor_location_id INTEGER;
ALTER TABLE checkins ADD COLUMN IF NOT EXISTS points_awarded INTEGER DEFAULT 0;
ALTER TABLE checkins ADD COLUMN IF NOT EXISTS sponsor_bonus_points INTEGER DEFAULT 0;

-- PG_ONLY_END
