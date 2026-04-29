
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
    console.log('🔄 Fixing ALL partner_school slugs...');
    
    // Get all partner_schools
    const users = await query("SELECT id, company FROM users WHERE userType = 'partner_school'");
    console.log(`Found ${users.length} partner_school users to process`);
    
    let fixed = 0;
    
    for (const user of users) {
      if (!user.company) {
        console.log(`⏭️  Skipping user ${user.id}: missing company`);
        continue;
      }
      
      const baseSlug = slugify(user.company);
      const finalSlug = await ensureUniqueSlug(baseSlug, user.id);
      
      await query('UPDATE users SET slug = $1 WHERE id = $2', [finalSlug, user.id]);
      fixed++;
      console.log(`✅ Fixed: ${user.company} -> ${finalSlug}`);
    }
    
    console.log(`\n✅ COMPLETE: Fixed ${fixed} slugs`);
    process.exit(0);
  } catch (err) {
    console.error('❌ ERROR:', err);
    process.exit(1);
  }
})();
