// Centralized navigation configuration
// Update links here and they will be reflected across all sidebar components

export const navigationItems = [
  { name: 'Dashboard', href: '/dashboard', icon: '🏠', path: '/dashboard' },
  { name: 'Profile', href: '/profile', icon: '👤', path: '/profile' },
  { name: 'Community', href: '/community', icon: '👥', path: '/community' },
  { name: 'Job Board', href: '/jobs', icon: '💼', path: '/jobs' },
  { name: 'Events', href: '/events', icon: '📅', path: '/events' },
  { name: 'Merch Store', href: '/merch-store', icon: '🛒', path: '/merch-store' },
  { name: 'Partner Schools', href: '/partner-schools', icon: '🎓', path: '/partner-schools' },
  { name: 'Podcasts', href: '/podcasts', icon: '🎙️', path: '/podcasts' },
  { name: 'Sponsors', href: '/sponsors', icon: '⭐', path: '/sponsors' },
  { name: 'Rewards', href: '/rewards', icon: '🎁', path: '/rewards' },
  { name: 'Donate', href: '/donate', icon: '💝', path: '/donate' }
];

// Different navigation items for different user types can be configured here
export const memberNavigation = navigationItems;

export const partnerSchoolNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: '🏠', path: '/dashboard' },
  { name: 'Profile', href: '/profile', icon: '👤', path: '/profile' },
  { name: 'Community', href: '/community', icon: '👥', path: '/community' },
  { name: 'Events', href: '/events', icon: '📅', path: '/events' },
  { name: 'Job Board', href: '/jobs', icon: '💼', path: '/jobs' },
  { name: 'Students', href: '/students', icon: '🎓', path: '/students' },
  { name: 'Analytics', href: '/analytics', icon: '📊', path: '/analytics' }
];

export const sponsorNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: '🏠', path: '/dashboard' },
  { name: 'Profile', href: '/profile', icon: '👤', path: '/profile' },
  { name: 'Community', href: '/community', icon: '👥', path: '/community' },
  { name: 'Events', href: '/events', icon: '📅', path: '/events' },
  { name: 'Sponsorships', href: '/sponsorships', icon: '⭐', path: '/sponsorships' },
  { name: 'Analytics', href: '/analytics', icon: '📊', path: '/analytics' }
];
