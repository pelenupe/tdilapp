-- Migration: 009_cohort_column
-- Ensure users.cohort text column exists and add admin-managed cohort list

-- Add cohort text column if it doesn't already exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS cohort VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_users_cohort_text ON users (cohort);

-- Admin-managed cohort names list (allows admins to pre-define cohort names
-- before assigning any users to them)
CREATE TABLE IF NOT EXISTS cohort_list (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cohort_list_name ON cohort_list (name);
CREATE INDEX IF NOT EXISTS idx_cohort_list_active ON cohort_list (is_active);
