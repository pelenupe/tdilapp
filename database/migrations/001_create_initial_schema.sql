-- Initial database schema for tDIL application
-- Migration: 001_create_initial_schema

-- Enable UUID extension for better primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table with enhanced security and indexing
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    company VARCHAR(255),
    job_title VARCHAR(255),
    location VARCHAR(255),
    linkedin_url VARCHAR(500),
    profile_image VARCHAR(500),
    points INTEGER DEFAULT 0 CHECK (points >= 0),
    level INTEGER DEFAULT 1 CHECK (level >= 1),
    user_type VARCHAR(50) DEFAULT 'member' CHECK (user_type IN ('member', 'partner_school', 'sponsor', 'admin')),
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    email_verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_user_type ON users (user_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_points ON users (points DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at ON users (created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active ON users (is_active) WHERE is_active = TRUE;

-- Events table
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    location VARCHAR(500),
    points INTEGER DEFAULT 0 CHECK (points >= 0),
    max_attendees INTEGER CHECK (max_attendees > 0),
    image_url VARCHAR(500),
    category VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_date ON events (event_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_category ON events (category);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_active ON events (is_active) WHERE is_active = TRUE;

-- Jobs table
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    company VARCHAR(255) NOT NULL,
    description TEXT,
    location VARCHAR(255),
    job_type VARCHAR(50) CHECK (job_type IN ('full-time', 'part-time', 'contract', 'internship')),
    points INTEGER DEFAULT 0 CHECK (points >= 0),
    requirements TEXT,
    benefits TEXT,
    salary_range VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    posted_by UUID REFERENCES users(id),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_company ON jobs (company);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_type ON jobs (job_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_location ON jobs (location);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_active ON jobs (is_active) WHERE is_active = TRUE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_created_at ON jobs (created_at DESC);

-- Announcements table
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100),
    is_featured BOOLEAN DEFAULT FALSE,
    points INTEGER DEFAULT 0 CHECK (points >= 0),
    image_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_announcements_featured ON announcements (is_featured) WHERE is_featured = TRUE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_announcements_active ON announcements (is_active) WHERE is_active = TRUE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_announcements_created_at ON announcements (created_at DESC);

-- Points history table
CREATE TABLE IF NOT EXISTS points_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    points INTEGER NOT NULL,
    reason VARCHAR(500),
    type VARCHAR(50) CHECK (type IN ('earned', 'spent', 'bonus', 'penalty')),
    reference_id UUID, -- Can reference events, jobs, rewards, etc.
    reference_type VARCHAR(50), -- 'event', 'job', 'reward', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_points_history_user_id ON points_history (user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_points_history_created_at ON points_history (created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_points_history_type ON points_history (type);

-- Connections table (networking feature)
CREATE TABLE IF NOT EXISTS connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id_1 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_id_2 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id_1, user_id_2),
    CHECK(user_id_1 != user_id_2)
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_connections_user1 ON connections (user_id_1);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_connections_user2 ON connections (user_id_2);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_connections_status ON connections (status);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CHECK(sender_id != receiver_id)
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_sender ON messages (sender_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_receiver ON messages (receiver_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_created_at ON messages (created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_unread ON messages (receiver_id, is_read) WHERE is_read = FALSE;

-- Rewards table
CREATE TABLE IF NOT EXISTS rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    points_cost INTEGER NOT NULL CHECK (points_cost > 0),
    category VARCHAR(100),
    quantity INTEGER DEFAULT 1 CHECK (quantity >= 0),
    is_active BOOLEAN DEFAULT TRUE,
    image_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rewards_category ON rewards (category);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rewards_points_cost ON rewards (points_cost);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rewards_active ON rewards (is_active) WHERE is_active = TRUE;

-- Reward redemptions table
CREATE TABLE IF NOT EXISTS reward_redemptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reward_id UUID NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
    points_spent INTEGER NOT NULL CHECK (points_spent > 0),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'delivered', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reward_redemptions_user ON reward_redemptions (user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reward_redemptions_reward ON reward_redemptions (reward_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reward_redemptions_status ON reward_redemptions (status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reward_redemptions_created_at ON reward_redemptions (created_at DESC);

-- Event attendees table
CREATE TABLE IF NOT EXISTS event_attendees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'registered' CHECK (status IN ('registered', 'attended', 'cancelled', 'no_show')),
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    attended_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(event_id, user_id)
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_attendees_event ON event_attendees (event_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_attendees_user ON event_attendees (user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_attendees_status ON event_attendees (status);

-- Job applications table
CREATE TABLE IF NOT EXISTS job_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cover_letter TEXT,
    resume_url VARCHAR(500),
    status VARCHAR(20) DEFAULT 'applied' CHECK (status IN ('applied', 'reviewing', 'interview', 'offer', 'rejected', 'withdrawn')),
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(job_id, user_id)
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_applications_job ON job_applications (job_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_applications_user ON job_applications (user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_applications_status ON job_applications (status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_applications_applied_at ON job_applications (applied_at DESC);

-- Audit log table for tracking important actions
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_user ON audit_log (user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_action ON audit_log (action);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_created_at ON audit_log (created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_resource ON audit_log (resource_type, resource_id);

-- User sessions table for proper session management
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token VARCHAR(500) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_user ON user_sessions (user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_token ON user_sessions (refresh_token);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_expires ON user_sessions (expires_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_active ON user_sessions (is_active) WHERE is_active = TRUE;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON announcements FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_connections_updated_at BEFORE UPDATE ON connections FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_rewards_updated_at BEFORE UPDATE ON rewards FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_reward_redemptions_updated_at BEFORE UPDATE ON reward_redemptions FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_job_applications_updated_at BEFORE UPDATE ON job_applications FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
