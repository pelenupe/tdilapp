import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { memberNavigation } from '../config/navigation';
import { useUser } from '../contexts/UserContext';
import Logo from './Logo';
import { getUserProfileImageUrl } from '../utils/profileImage';

export default function SidebarMember({ collapsible = false, onCollapsedChange }) {
  const { user, clearUser, updateUser } = useUser();
  const location = useLocation();

  // In collapsible mode, default to collapsed on tablet (< 1024px)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (!collapsible) return false;
    return typeof window !== 'undefined' && window.innerWidth < 1024;
  });

  const toggleCollapsed = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    onCollapsedChange?.(next);
  };

  const handleLogout = () => {
    clearUser();
    window.location.href = '/login';
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('profilePic', file);

      const token = localStorage.getItem('token');
      const response = await fetch('/api/members/update', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        updateUser({
          ...result.user,
          profileImage: result.user.profileImage,
          profileImageUpdatedAt: Date.now()
        });
        alert('Profile picture updated successfully!');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to upload profile picture');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload profile picture. Please try again.');
    }
  };

  if (!user) return null;

  const profileImageUrl = getUserProfileImageUrl(user);

  // In collapsible mode show at md+, otherwise lg+ only
  const visibilityClass = collapsible ? 'hidden md:flex' : 'hidden lg:flex';
  const widthClass = isCollapsed ? 'w-16' : 'w-64';

  return (
    <div className={`${visibilityClass} h-screen bg-gray-100 fixed inset-y-0 left-0 z-30 ${widthClass} transition-all duration-300`}>
      <div className="flex flex-col flex-1 min-h-0 bg-white border-r border-gray-200 w-full overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 bg-gray-100 border-b flex-shrink-0">
          {isCollapsed ? (
            <Logo size="xs" />
          ) : (
            <Logo size="sm" />
          )}
          {/* Collapse arrow - only in collapsible mode */}
          {collapsible && (
            <button
              onClick={toggleCollapsed}
              className="ml-auto w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-500 hover:text-gray-800 transition-colors flex-shrink-0"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <span
                className="text-xs font-bold transition-transform duration-300"
                style={{ display: 'inline-block', transform: isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)' }}
              >
                ◀
              </span>
            </button>
          )}
        </div>

        {/* User info */}
        <div className={`border-b border-gray-200 flex-shrink-0 ${isCollapsed ? 'px-2 py-3' : 'px-4 py-4'}`}>
          <div className={`flex flex-col items-center space-y-2`}>
            <div className="relative group">
              {profileImageUrl ? (
                <img
                  src={profileImageUrl}
                  alt={`${user.firstName} ${user.lastName}`}
                  className={`rounded-full object-cover border-2 border-gray-200 transition-all duration-300 ${isCollapsed ? 'w-10 h-10' : 'w-16 h-16'}`}
                />
              ) : (
                <div className={`rounded-full bg-blue-100 flex items-center justify-center border-2 border-gray-200 transition-all duration-300 ${isCollapsed ? 'w-10 h-10' : 'w-16 h-16'}`}>
                  <span className={`text-blue-600 font-semibold ${isCollapsed ? 'text-xs' : 'text-lg'}`}>
                    {user.firstName?.[0]}{user.lastName?.[0]}
                  </span>
                </div>
              )}

              {/* Upload Overlay */}
              {!isCollapsed && (
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <label className="cursor-pointer text-white text-xs font-medium">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    📷 Change
                  </label>
                </div>
              )}
            </div>

            {!isCollapsed && (
              <div className="text-center">
                <Link to="/profile" className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline">
                  {user.firstName} {user.lastName}
                </Link>
                <p className="text-xs text-gray-500">
                  {user.points?.toLocaleString() || 0} points
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className={`flex-1 py-4 space-y-1 overflow-y-auto ${isCollapsed ? 'px-1' : 'px-2'}`}>
          {memberNavigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                title={isCollapsed ? item.name : undefined}
                className={`group flex items-center py-2 text-sm font-medium rounded-md transition-colors duration-150 ease-in-out ${
                  isCollapsed ? 'justify-center px-2' : 'px-2'
                } ${
                  isActive
                    ? 'bg-blue-100 text-blue-900 border-r-2 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span className={`text-lg flex-shrink-0 ${!isCollapsed ? 'mr-3' : ''}`}>{item.icon}</span>
                {!isCollapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className={`border-t border-gray-200 flex-shrink-0 py-4 ${isCollapsed ? 'px-1' : 'px-2'}`}>
          <button
            onClick={handleLogout}
            title={isCollapsed ? 'Logout' : undefined}
            className={`group flex items-center w-full py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900 transition-colors duration-150 ease-in-out ${
              isCollapsed ? 'justify-center px-2' : 'px-2'
            }`}
          >
            <span className={`text-lg flex-shrink-0 ${!isCollapsed ? 'mr-3' : ''}`}>🚪</span>
            {!isCollapsed && <span>Logout</span>}
          </button>
        </div>
      </div>
    </div>
  );
}
