/**
 * CRITICAL FIX: Properly backfill ALL user slugs using EXACT same logic as frontend/backend
 * Fixes mismatch between migration (simple concat) and actual slugify function (with NFD normalization)
 */

const { query } = require('../backend/config/database');

// MUST match frontend/backend slugify exactly
const slugify = (str) => {
  const normalized = (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
  return normalized;
};

// Ensure slug is unique (appends -2, -3, etc if taken)
const ensureUniqueSlug = async (baseSlug, excludeId = null) => {
  let candidate = baseSlug;
  for (let n = 2; n < 1000; n++) {
    const existing = await query(
      'SELECT id FROM users WHERE slug = $1' + (excludeId ? ' AND id != $2' : ''),
      excludeId ? [candidate, excludeId] : [candidate]
    );
    if (!existing.length) return candidate;
    candidate = `${baseSlug}-${n}`;
  }
  return candidate;
};

(async () => {
  try {
    console.log('🔄 Fixing ALL user slugs with proper normalization...');
    
    // Get all users
    const users = await query('SELECT id, firstName, lastName FROM users ORDER BY id ASC');
    console.log(`Found ${users.length} users to process`);
    
    let fixed = 0;
    let skipped = 0;
    
    for (const user of users) {
      if (!user.firstName || !user.lastName) {
        console.log(`⏭️  Skipping user ${user.id}: missing firstName or lastName`);
        skipped++;
        continue;
      }
      
      const baseSlug = slugify(`${user.firstName} ${user.lastName}`);
      const finalSlug = await ensureUniqueSlug(baseSlug, user.id);
      
      await query('UPDATE users SET slug = $1 WHERE id = $2', [finalSlug, user.id]);
      fixed++;
      
      if (fixed % 50 === 0) {
        console.log(`✅ Fixed ${fixed}/${users.length} users`);
      }
    }
    
    console.log(`\n✅ COMPLETE: Fixed ${fixed} user slugs, skipped ${skipped}`);
    console.log('All users now have slugs matching the frontend/backend logic!');
    process.exit(0);
  } catch (err) {
    console.error('❌ ERROR:', err);
    process.exit(1);
  }
})();
