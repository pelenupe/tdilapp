
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
    console.log('🔄 Re-fixing ALL user slugs...');
    
    // Get all users
    const users = await query('SELECT id, firstName, lastName, userType, company FROM users');
    console.log(`Found ${users.length} users to process`);
    
    let fixed = 0;
    
    for (const user of users) {
      let baseSlug;
      
      // If partner_school, use company name
      if (user.userType === 'partner_school' && user.company) {
        baseSlug = slugify(user.company);
      } else if (user.firstName && user.lastName) {
        baseSlug = slugify(`${user.firstName} ${user.lastName}`);
      } else {
        console.log(`⏭️  Skipping user ${user.id}: missing name/company`);
        continue;
      }
      
      const finalSlug = await ensureUniqueSlug(baseSlug, user.id);
      
      await query('UPDATE users SET slug = $1 WHERE id = $2', [finalSlug, user.id]);
      fixed++;
      console.log(`✅ Fixed user ${user.id}: ${user.firstName} ${user.lastName} (${user.userType}) -> ${finalSlug}`);
    }
    
    console.log(`\n✅ COMPLETE: Fixed ${fixed} slugs`);
    process.exit(0);
  } catch (err) {
    console.error('❌ ERROR:', err);
    process.exit(1);
  }
})();
