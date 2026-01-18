-- Migration: Add user_type to invite_tokens for reusable tokens per user type
-- One token per user type that never expires and can be reused

-- Add user_type column to invite_tokens
ALTER TABLE invite_tokens ADD COLUMN IF NOT EXISTS user_type VARCHAR(50) DEFAULT 'member';

-- Add is_reusable column (tokens can be used multiple times)
ALTER TABLE invite_tokens ADD COLUMN IF NOT EXISTS is_reusable BOOLEAN DEFAULT FALSE;

-- Add use_count to track how many times a reusable token has been used
ALTER TABLE invite_tokens ADD COLUMN IF NOT EXISTS use_count INTEGER DEFAULT 0;

-- Create permanent reusable tokens for each user type
-- These tokens never expire and can be used by multiple users

-- Member invite token
INSERT INTO invite_tokens (token, user_type, is_reusable, is_used, expires_at, created_by)
SELECT 'TDIL-MEMBER-INVITE', 'member', TRUE, FALSE, NULL, 
       (SELECT id FROM users WHERE usertype = 'admin' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM invite_tokens WHERE token = 'TDIL-MEMBER-INVITE');

-- Partner School invite token
INSERT INTO invite_tokens (token, user_type, is_reusable, is_used, expires_at, created_by)
SELECT 'TDIL-PARTNER-INVITE', 'partner_school', TRUE, FALSE, NULL,
       (SELECT id FROM users WHERE usertype = 'admin' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM invite_tokens WHERE token = 'TDIL-PARTNER-INVITE');

-- Sponsor invite token
INSERT INTO invite_tokens (token, user_type, is_reusable, is_used, expires_at, created_by)
SELECT 'TDIL-SPONSOR-INVITE', 'sponsor', TRUE, FALSE, NULL,
       (SELECT id FROM users WHERE usertype = 'admin' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM invite_tokens WHERE token = 'TDIL-SPONSOR-INVITE');

-- Admin invite token (for creating new admins - use sparingly)
INSERT INTO invite_tokens (token, user_type, is_reusable, is_used, expires_at, created_by)
SELECT 'TDIL-ADMIN-SECURE', 'admin', TRUE, FALSE, NULL,
       (SELECT id FROM users WHERE usertype = 'admin' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM invite_tokens WHERE token = 'TDIL-ADMIN-SECURE');

-- Create index for user_type lookups
CREATE INDEX IF NOT EXISTS idx_invite_tokens_user_type ON invite_tokens(user_type);
