/**
 * Convert text to URL-safe slug format
 * Matches backend slugify: lowercase, remove accents, alphanumeric + hyphens only
 */
export const slugify = (str) =>
  (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

/**
 * Generate member permalink from prefix/firstName/lastName
 * Format: prefix-firstname-lastname (prefix optional)
 * Returns stored slug if available, otherwise generates from fields
 */
export const getMemberSlug = (member) => {
  if (!member) return '';
  if (member.slug) return member.slug;
  if (member.firstName && member.lastName) {
    const parts = [member.prefix, member.firstName, member.lastName].filter(Boolean);
    return slugify(parts.join(' '));
  }
  return member.id?.toString() || '';
};

/**
 * Generate organization permalink from name/org_type
 * For sponsor/employer/school - use entity-name format
 */
export const getOrgSlug = (org) => {
  if (!org) return '';
  if (org.slug) return org.slug;
  if (org.name) return slugify(org.name);
  return org.id?.toString() || '';
};
