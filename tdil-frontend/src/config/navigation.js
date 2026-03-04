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
  { name: 'Dashboard', href: '/dashboard', icon: '🏠', path: '/dashboard' },
  { name: 'Profile', href: '/profile', icon: '👤', path: '/profile' },
  { name: 'Students', href: '/students', icon: '🎓', path: '/students' },
  { name: 'Analytics', href: '/analytics', icon: '📊', path: '/analytics' },
  { name: 'Chats', href: '/chats', icon: '💬', path: '/chats' },
  { name: 'Community', href: '/community', icon: '👥', path: '/community' },
  { name: 'Events', href: '/events', icon: '📅', path: '/events' },
  { name: 'Job Board', href: '/jobs', icon: '💼', path: '/jobs' }
];

export const sponsorNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: '🏠', path: '/dashboard' },
  { name: 'Profile', href: '/profile', icon: '👤', path: '/profile' },
  { name: 'Analytics', href: '/analytics', icon: '📊', path: '/analytics' },
  { name: 'Chats', href: '/chats', icon: '💬', path: '/chats' },
  { name: 'Community', href: '/community', icon: '👥', path: '/community' },
  { name: 'Events', href: '/events', icon: '📅', path: '/events' },
  { name: 'Sponsorships', href: '/sponsorships', icon: '⭐', path: '/sponsorships' }
];
