-- Migration: 005_cohorts_and_groups
-- Add cohort system, group chats, alma mater, and analytics

-- Add alma_mater and graduation_year to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS alma_mater VARCHAR(255),
ADD COLUMN IF NOT EXISTS graduation_year INTEGER,
ADD COLUMN IF NOT EXISTS cohort_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_users_alma_mater ON users (alma_mater);
CREATE INDEX IF NOT EXISTS idx_users_cohort ON users (cohort_id);

-- Cohorts table (groups of users from same school/year)
CREATE TABLE IF NOT EXISTS cohorts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    school_name VARCHAR(255) NOT NULL,
    graduation_year INTEGER NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(school_name, graduation_year)
);

CREATE INDEX IF NOT EXISTS idx_cohorts_school ON cohorts (school_name);
CREATE INDEX IF NOT EXISTS idx_cohorts_year ON cohorts (graduation_year);
CREATE INDEX IF NOT EXISTS idx_cohorts_active ON cohorts (is_active) WHERE is_active = TRUE;

-- Cohort members table (many-to-many)
CREATE TABLE IF NOT EXISTS cohort_members (
    id SERIAL PRIMARY KEY,
    cohort_id INTEGER NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('member', 'admin', 'moderator')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(cohort_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_cohort_members_cohort ON cohort_members (cohort_id);
CREATE INDEX IF NOT EXISTS idx_cohort_members_user ON cohort_members (user_id);
CREATE INDEX IF NOT EXISTS idx_cohort_members_role ON cohort_members (role);

-- Group chats table (for cohorts and direct messages)
CREATE TABLE IF NOT EXISTS group_chats (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    chat_type VARCHAR(50) NOT NULL CHECK (chat_type IN ('cohort', 'direct', 'custom')),
    cohort_id INTEGER REFERENCES cohorts(id) ON DELETE CASCADE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_group_chats_type ON group_chats (chat_type);
CREATE INDEX IF NOT EXISTS idx_group_chats_cohort ON group_chats (cohort_id);
CREATE INDEX IF NOT EXISTS idx_group_chats_active ON group_chats (is_active) WHERE is_active = TRUE;

-- Group chat members
CREATE TABLE IF NOT EXISTS group_chat_members (
    id SERIAL PRIMARY KEY,
    group_chat_id INTEGER NOT NULL REFERENCES group_chats(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('member', 'admin')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_chat_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_chat_members_chat ON group_chat_members (group_chat_id);
CREATE INDEX IF NOT EXISTS idx_group_chat_members_user ON group_chat_members (user_id);

-- Group messages table
CREATE TABLE IF NOT EXISTS group_messages (
    id SERIAL PRIMARY KEY,
    group_chat_id INTEGER NOT NULL REFERENCES group_chats(id) ON DELETE CASCADE,
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'event', 'meetup')),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_group_messages_chat ON group_messages (group_chat_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_sender ON group_messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_created_at ON group_messages (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_messages_type ON group_messages (message_type);

-- Cohort events/meetups (scheduled by cohort members)
CREATE TABLE IF NOT EXISTS cohort_events (
    id SERIAL PRIMARY KEY,
    cohort_id INTEGER NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
    group_chat_id INTEGER REFERENCES group_chats(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    location VARCHAR(500),
    location_type VARCHAR(50) CHECK (location_type IN ('in-person', 'virtual', 'hybrid')),
    max_attendees INTEGER,
    created_by INTEGER NOT NULL REFERENCES users(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cohort_events_cohort ON cohort_events (cohort_id);
CREATE INDEX IF NOT EXISTS idx_cohort_events_date ON cohort_events (event_date);
CREATE INDEX IF NOT EXISTS idx_cohort_events_creator ON cohort_events (created_by);
CREATE INDEX IF NOT EXISTS idx_cohort_events_active ON cohort_events (is_active) WHERE is_active = TRUE;

-- Cohort event attendees
CREATE TABLE IF NOT EXISTS cohort_event_attendees (
    id SERIAL PRIMARY KEY,
    cohort_event_id INTEGER NOT NULL REFERENCES cohort_events(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'registered' CHECK (status IN ('registered', 'attended', 'cancelled', 'no_show')),
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    attended_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(cohort_event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_cohort_event_attendees_event ON cohort_event_attendees (cohort_event_id);
CREATE INDEX IF NOT EXISTS idx_cohort_event_attendees_user ON cohort_event_attendees (user_id);
CREATE INDEX IF NOT EXISTS idx_cohort_event_attendees_status ON cohort_event_attendees (status);

-- Venues table (for check-ins - already created in migration 004)
-- This references existing venues table for partner school/sponsor locations

-- Partner school/sponsor analytics - check-ins tracking
CREATE TABLE IF NOT EXISTS location_checkins (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    location_name VARCHAR(255) NOT NULL,
    location_type VARCHAR(50) CHECK (location_type IN ('partner_school', 'sponsor', 'venue', 'other')),
    partner_id INTEGER REFERENCES users(id), -- references partner school or sponsor user
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    checked_in_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    points_awarded INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_location_checkins_user ON location_checkins (user_id);
CREATE INDEX IF NOT EXISTS idx_location_checkins_partner ON location_checkins (partner_id);
CREATE INDEX IF NOT EXISTS idx_location_checkins_type ON location_checkins (location_type);
CREATE INDEX IF NOT EXISTS idx_location_checkins_date ON location_checkins (checked_in_at DESC);

-- Partner school/sponsor connection analytics
CREATE TABLE IF NOT EXISTS partner_connections (
    id SERIAL PRIMARY KEY,
    partner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- partner school or sponsor
    connected_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    connection_type VARCHAR(50) CHECK (connection_type IN ('alma_mater', 'direct_connect')),
    connected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(partner_id, connected_user_id)
);

CREATE INDEX IF NOT EXISTS idx_partner_connections_partner ON partner_connections (partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_connections_user ON partner_connections (connected_user_id);
CREATE INDEX IF NOT EXISTS idx_partner_connections_type ON partner_connections (connection_type);
CREATE INDEX IF NOT EXISTS idx_partner_connections_date ON partner_connections (connected_at DESC);

-- Add triggers for updated_at
CREATE TRIGGER update_cohorts_updated_at BEFORE UPDATE ON cohorts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_group_chats_updated_at BEFORE UPDATE ON group_chats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_group_messages_updated_at BEFORE UPDATE ON group_messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cohort_events_updated_at BEFORE UPDATE ON cohort_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add foreign key constraint from users to cohorts
ALTER TABLE users 
ADD CONSTRAINT fk_users_cohort 
FOREIGN KEY (cohort_id) REFERENCES cohorts(id) ON DELETE SET NULL;

-- Create view for partner school analytics
CREATE OR REPLACE VIEW partner_school_analytics AS
SELECT 
    p.id as partner_id,
    p.firstname || ' ' || p.lastname as partner_name,
    p.company as school_name,
    COUNT(DISTINCT pc.connected_user_id) as total_connections,
    COUNT(DISTINCT CASE WHEN pc.connection_type = 'alma_mater' THEN pc.connected_user_id END) as alumni_connections,
    COUNT(DISTINCT lc.user_id) as total_checkins,
    COUNT(DISTINCT lc.user_id) FILTER (WHERE lc.checked_in_at >= NOW() - INTERVAL '30 days') as checkins_last_30_days,
    COUNT(DISTINCT u.id) FILTER (WHERE u.alma_mater = p.company) as total_alumni
FROM users p
LEFT JOIN partner_connections pc ON p.id = pc.partner_id
LEFT JOIN location_checkins lc ON p.id = lc.partner_id
LEFT JOIN users u ON u.alma_mater = p.company
WHERE p.usertype = 'partner_school'
GROUP BY p.id, p.firstname, p.lastname, p.company;

-- Create view for sponsor analytics
CREATE OR REPLACE VIEW sponsor_analytics AS
SELECT 
    s.id as sponsor_id,
    s.firstname || ' ' || s.lastname as sponsor_name,
    s.company as sponsor_company,
    COUNT(DISTINCT pc.connected_user_id) as total_connections,
    COUNT(DISTINCT lc.user_id) as total_checkins,
    COUNT(DISTINCT lc.user_id) FILTER (WHERE lc.checked_in_at >= NOW() - INTERVAL '30 days') as checkins_last_30_days,
    COUNT(DISTINCT lc.user_id) FILTER (WHERE lc.checked_in_at >= NOW() - INTERVAL '7 days') as checkins_last_7_days
FROM users s
LEFT JOIN partner_connections pc ON s.id = pc.partner_id
LEFT JOIN location_checkins lc ON s.id = lc.partner_id
WHERE s.usertype = 'sponsor'
GROUP BY s.id, s.firstname, s.lastname, s.company;

-- Create view for cohort summary
CREATE OR REPLACE VIEW cohort_summary AS
SELECT 
    c.id as cohort_id,
    c.name as cohort_name,
    c.school_name,
    c.graduation_year,
    COUNT(DISTINCT cm.user_id) as member_count,
    COUNT(DISTINCT gc.id) as chat_count,
    COUNT(DISTINCT ce.id) as event_count,
    COUNT(DISTINCT gm.id) as message_count,
    c.created_at
FROM cohorts c
LEFT JOIN cohort_members cm ON c.id = cm.cohort_id
LEFT JOIN group_chats gc ON c.id = gc.cohort_id
LEFT JOIN cohort_events ce ON c.id = ce.cohort_id
LEFT JOIN group_messages gm ON gc.id = gm.group_chat_id
WHERE c.is_active = TRUE
GROUP BY c.id, c.name, c.school_name, c.graduation_year, c.created_at;
