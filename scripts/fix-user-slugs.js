/**
 * CRITICAL FIX: Backfill ALL user slugs using prefix-firstname-lastname format
 * Format: prefix-firstname-lastname (e.g. dr-john-smith, ms-jane-doe)
 * If no prefix: firstname-lastname
 */

const { query } = require('../backend/config/database');

// MUST match frontend/backend slugify exactly
const slugify = (str) => {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
};

// Build slug base: prefix-firstname-lastname (prefix optional)
const buildSlugBase = (firstName, lastName, prefix) => {
  const parts = [prefix, firstName, lastName].filter(Boolean);
  return parts.join('-');
};

// Ensure slug is unique (appends -2, -3, etc if taken)
const ensureUniqueSlug = async (baseSlug, excludeId = null) => {
  let candidate = slugify(baseSlug);
  const base = candidate;
  for (let n = 2; n < 1000; n++) {
    const existing = await query(
      'SELECT id FROM users WHERE slug = ?' + (excludeId ? ' AND id != ?' : ''),
      excludeId ? [candidate, excludeId] : [candidate]
    );
    if (!existing.length) return candidate;
    candidate = `${base}-${n}`;
  }
  return candidate;
};

(async () => {
  try {
    console.log('🔄 Fixing ALL user slugs with prefix-firstname-lastname format...');
    
    // Get all users including prefix
    const users = await query('SELECT id, firstName, lastName, prefix FROM users ORDER BY id ASC');
    console.log(`Found ${users.length} users to process`);
    
    let fixed = 0;
    let skipped = 0;
    
    for (const user of users) {
      if (!user.firstName || !user.lastName) {
        console.log(`⏭️  Skipping user ${user.id}: missing firstName or lastName`);
        skipped++;
        continue;
      }
      
      const base = buildSlugBase(user.firstName, user.lastName, user.prefix);
      const finalSlug = await ensureUniqueSlug(base, user.id);
      
      await query('UPDATE users SET slug = ? WHERE id = ?', [finalSlug, user.id]);
      console.log(`  ✓ ${user.firstName} ${user.lastName} → ${finalSlug}`);
      fixed++;
    }
    
    console.log(`\n✅ COMPLETE: Fixed ${fixed} user slugs, skipped ${skipped}`);
    console.log('All users now have slugs in prefix-firstname-lastname format!');
    process.exit(0);
  } catch (err) {
    console.error('❌ ERROR:', err);
    process.exit(1);
  }
})();
