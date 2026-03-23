/**
 * CRITICAL FIX: Properly backfill ALL org_profiles slugs using EXACT same logic as frontend/backend
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
      'SELECT id FROM org_profiles WHERE slug = $1' + (excludeId ? ' AND id != $2' : ''),
      excludeId ? [candidate, excludeId] : [candidate]
    );
    if (!existing.length) return candidate;
    candidate = `${baseSlug}-${n}`;
  }
  return candidate;
};

(async () => {
  try {
    console.log('🔄 Fixing ALL org_profiles slugs with proper normalization...');
    
    // Get all orgs
    const orgs = await query('SELECT id, name FROM org_profiles ORDER BY id ASC');
    console.log(`Found ${orgs.length} organizations to process`);
    
    let fixed = 0;
    let skipped = 0;
    
    for (const org of orgs) {
      if (!org.name) {
        console.log(`⏭️  Skipping org ${org.id}: missing name`);
        skipped++;
        continue;
      }
      
      const baseSlug = slugify(org.name);
      const finalSlug = await ensureUniqueSlug(baseSlug, org.id);
      
      await query('UPDATE org_profiles SET slug = $1 WHERE id = $2', [finalSlug, org.id]);
      fixed++;
      
      if (fixed % 10 === 0) {
        console.log(`✅ Fixed ${fixed}/${orgs.length} orgs`);
      }
    }
    
    console.log(`\n✅ COMPLETE: Fixed ${fixed} org slugs, skipped ${skipped}`);
    console.log('All organizations now have slugs matching the frontend/backend logic!');
    process.exit(0);
  } catch (err) {
    console.error('❌ ERROR:', err);
    process.exit(1);
  }
})();
