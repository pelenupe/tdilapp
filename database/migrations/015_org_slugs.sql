-- Migration 015: add slug column to org_profiles for clean permalink URLs
-- e.g. "Indiana Wesleyan University" → "indiana-wesleyan-university"

ALTER TABLE org_profiles ADD COLUMN IF NOT EXISTS slug VARCHAR(255);

-- Backfill slugs for existing orgs from their name
-- (app code will also do this lazily, but this catches any already in the DB)
UPDATE org_profiles
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      TRIM(name),
    '[^a-zA-Z0-9\s\-]', '', 'g'),
  '\s+', '-', 'g')
)
WHERE slug IS NULL AND name IS NOT NULL;

-- Create unique index (NULLs are allowed multiple times in PostgreSQL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_org_profiles_slug ON org_profiles (slug);
