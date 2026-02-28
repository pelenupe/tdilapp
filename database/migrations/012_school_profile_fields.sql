-- Migration: 012_school_profile_fields
-- Adds school-specific profile fields and member affiliation fields

-- School profile fields (for partner_school users)
ALTER TABLE users ADD COLUMN IF NOT EXISTS school_intro_video_url VARCHAR(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS school_zoom_url VARCHAR(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS school_contact_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS school_contact_email VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS school_materials_url VARCHAR(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS school_featured INTEGER DEFAULT 0;

-- Member affiliation fields (for regular member users)
ALTER TABLE users ADD COLUMN IF NOT EXISTS partner_school_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS partner_school_status VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_users_school_featured ON users (school_featured);
CREATE INDEX IF NOT EXISTS idx_users_partner_school ON users (partner_school_name);
