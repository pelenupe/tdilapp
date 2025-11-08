import { Link, useLocation } from 'react-router-dom';
import { memberNavigation } from '../config/navigation';
import { useUser } from '../contexts/UserContext';
import Logo from './Logo';
import ProfilePictureUpload from './ProfilePictureUpload';

export default function SidebarMember() {
  const { user, clearUser } = useUser();
  const location = useLocation();

  const handleLogout = () => {
    clearUser();
    window.location.href = '/login';
  };

  if (!user) return null;

  return (
    <div className="hidden lg:flex h-screen bg-gray-100 fixed inset-y-0 left-0 z-30 w-64">
        <div className="flex flex-col flex-1 min-h-0 bg-white border-r border-gray-200">
          {/* Header */}
          <div className="flex items-center justify-between h-16 px-4 bg-gray-100 border-b">
            <Logo variant="compact" size="md" />
          </div>

          {/* User info with Profile Picture */}
          <div className="px-4 py-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              {user.profileImage ? (
                <img 
                  src={user.profileImage} 
                  alt={`${user.firstName} ${user.lastName}`}
                  className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                />
              ) : (
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center border-2 border-gray-200">
                  <span className="text-blue-600 font-semibold text-sm">
                    {user.firstName?.[0]}{user.lastName?.[0]}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-gray-500">
                  {user.points?.toLocaleString() || 0} points
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {memberNavigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-150 ease-in-out ${
                    isActive
                      ? 'bg-blue-100 text-blue-900 border-r-2 border-blue-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className="mr-3 text-lg">{item.icon}</span>
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="px-2 py-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="group flex items-center w-full px-2 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900 transition-colors duration-150 ease-in-out"
            >
              <span className="mr-3 text-lg">🚪</span>
              Logout
            </button>
          </div>
        </div>
      </div>
  );
}
