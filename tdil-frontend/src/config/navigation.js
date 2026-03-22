// Centralized navigation configuration
// Update links here and they will be reflected across all sidebar components

export const navigationItems = [
  { name: 'Dashboard', href: '/dashboard', icon: '🏠', path: '/dashboard' },
  { name: 'Profile', href: '/profile', icon: '👤', path: '/profile' },
  { name: 'Check-In', href: '/checkin', icon: '📍', path: '/checkin' },
  { name: 'My Cohort', href: '/cohort', icon: '🎓', path: '/cohort' },
  { name: 'Chats', href: '/chats', icon: '💬', path: '/chats' },
  { name: 'Community', href: '/community', icon: '👥', path: '/community' },
  { name: 'Job Board', href: '/jobs', icon: '💼', path: '/jobs' },
  { name: 'Events', href: '/events', icon: '📅', path: '/events' },
  { name: 'Calendar', href: '/calendar', icon: '🗓️', path: '/calendar' },
  { name: 'Merch Store', href: '/merch-store', icon: '🛒', path: '/merch-store' },
  { name: 'Partner Schools', href: '/partner-schools', icon: '🏫', path: '/partner-schools' },
  { name: 'Rewards', href: '/rewards', icon: '🎁', path: '/rewards' },
  { name: 'Donate', href: '/donate', icon: '💝', path: '/donate' }
];

// Admin-only items (visible to admin + founder only)
export const adminNavigation = [
  { name: 'Admin Dashboard', href: '/admin', icon: '🛡️', adminOnly: true },
  { name: 'Manage Cohorts', href: '/admin/users', icon: '🎓', adminOnly: true }
];

// Different navigation items for different user types can be configured here
export const memberNavigation = navigationItems;

export const partnerSchoolNavigation = [
  { name: 'Dashboard',       href: '/dashboard',      icon: '🏠' },
  { name: 'My Profile',      href: '/profile',         icon: '👤' },
  { name: 'Partner Portal',  href: '/partner-portal',  icon: '🏫' },
  { name: 'Community',       href: '/community',       icon: '👥' },
  { name: 'Job Board',       href: '/jobs',            icon: '💼' },
  { name: 'Events',          href: '/events',          icon: '📅' },
  { name: 'Chats',           href: '/chats',           icon: '💬' },
  { name: 'Partner Schools', href: '/partner-schools', icon: '🎓' },
];

export const sponsorNavigation = [
  { name: 'Dashboard',     href: '/dashboard',    icon: '🏠' },
  { name: 'My Profile',    href: '/profile',       icon: '👤' },
  { name: 'Sponsor Portal',href: '/sponsor-portal',icon: '🤝' },
  { name: 'Community',     href: '/community',     icon: '👥' },
  { name: 'Events',        href: '/events',        icon: '📅' },
  { name: 'Chats',         href: '/chats',         icon: '💬' },
];

export const employerNavigation = [
  { name: 'Dashboard',       href: '/dashboard',       icon: '🏠' },
  { name: 'My Profile',      href: '/profile',          icon: '👤' },
  { name: 'Employer Portal', href: '/employer-portal',  icon: '💼' },
  { name: 'Post a Job',      href: '/employer-portal',  icon: '📋' },
  { name: 'Job Board',       href: '/jobs',             icon: '🗂️' },
  { name: 'Community',       href: '/community',        icon: '👥' },
  { name: 'Events',          href: '/events',           icon: '📅' },
  { name: 'Chats',           href: '/chats',            icon: '💬' },
];
