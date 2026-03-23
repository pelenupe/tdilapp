-- Migration 016: add slug column to users for unique permalinks
ALTER TABLE users ADD COLUMN IF NOT EXISTS slug VARCHAR(255);

-- Create index for slug lookups
CREATE INDEX IF NOT EXISTS idx_users_slug ON users (slug);

-- Backfill slugs for existing users: firstname-lastname, made unique
UPDATE users SET slug = (
  SELECT CASE
    WHEN COUNT(*) = 1 THEN LOWER(firstname || '-' || lastname)
    ELSE LOWER(firstname || '-' || lastname) || '-' || CAST(id AS TEXT)
  END
  FROM users u2
  WHERE LOWER(u2.firstname || '-' || u2.lastname) = LOWER(users.firstname || '-' || users.lastname)
  AND u2.id <= users.id
)
WHERE slug IS NULL;