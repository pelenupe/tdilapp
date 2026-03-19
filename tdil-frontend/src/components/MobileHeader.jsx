import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import Logo from './Logo';

export default function MobileHeader({ userType = 'member' }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const getMenuItems = () => {
    switch (userType) {
      case 'partner_school':
        return [
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Community', path: '/community' },
          { label: 'Events', path: '/events' },
          { label: 'Job Board', path: '/jobs' },
          { label: 'Partner Schools', path: '/partner-schools' },
          { label: 'Rewards', path: '/rewards' },
          { label: 'Profile', path: '/profile' }
        ];
      case 'sponsor':
        return [
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Community', path: '/community' },
          { label: 'Events', path: '/events' },
          { label: 'Job Board', path: '/jobs' },
          { label: 'Sponsors', path: '/sponsors' },
          { label: 'Rewards', path: '/rewards' },
          { label: 'Profile', path: '/profile' }
        ];
      default:
        return [
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Community', path: '/community' },
          { label: 'Events', path: '/events' },
          { label: 'Job Board', path: '/jobs' },
          { label: 'Rewards', path: '/rewards' },
          { label: 'Merch Store', path: '/merch-store' },
          { label: 'Profile', path: '/profile' }
        ];
    }
  };

  return (
    <>
      {/* Fixed Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <Logo size="lg" showText={false} />
          
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black bg-opacity-50" onClick={() => setIsMenuOpen(false)}>
          <div className="fixed top-0 right-0 h-full w-64 bg-white shadow-lg transform transition-transform duration-300">
            <div className="pt-16 px-4">
              <nav className="space-y-1">
                {getMenuItems().map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMenuOpen(false)}
                    className="block px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg font-medium"
                  >
                    {item.label}
                  </Link>
                ))}
                
                <hr className="my-4" />
                
                <Link
                  to="/settings"
                  onClick={() => setIsMenuOpen(false)}
                  className="block px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg font-medium"
                >
                  Settings
                </Link>
                
                <button
                  onClick={() => {
                    localStorage.removeItem('user');
                    window.location.href = '/login';
                  }}
                  className="block w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg font-medium"
                >
                  Logout
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
