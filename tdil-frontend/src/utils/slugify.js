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
 * Generate member permalink from firstName/lastName
 * Returns slug or generates from names if not available
 */
export const getMemberSlug = (member) => {
  if (!member) return '';
  if (member.slug) return member.slug;
  if (member.firstName && member.lastName) {
    return slugify(`${member.firstName} ${member.lastName}`);
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
