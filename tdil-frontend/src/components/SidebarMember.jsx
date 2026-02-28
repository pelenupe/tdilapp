import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { memberNavigation, adminNavigation } from '../config/navigation';
import { useUser } from '../contexts/UserContext';
import { useSidebar } from '../contexts/SidebarContext';
import Logo from './Logo';
import { getUserProfileImageUrl } from '../utils/profileImage';

export default function SidebarMember() {
  const { user, clearUser, updateUser } = useUser();
  const { isCollapsed, setIsCollapsed } = useSidebar();
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useRef(null);

  const toggleCollapsed = () => setIsCollapsed(prev => !prev);

  // Fetch notifications
  const fetchNotifications = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch('/api/notifications', { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    await fetch('/api/notifications/read-all', { method: 'PATCH', headers: { 'Authorization': `Bearer ${token}` } });
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
  };

  const markRead = async (id) => {
    const token = localStorage.getItem('token');
    await fetch(`/api/notifications/${id}/read`, { method: 'PATCH', headers: { 'Authorization': `Bearer ${token}` } });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleLogout = () => {
    clearUser();
    window.location.href = '/login';
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Please select an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { alert('Image size must be less than 5MB'); return; }

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
        updateUser({ ...result.user, profileImage: result.user.profileImage, profileImageUpdatedAt: Date.now() });
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
  const widthClass = isCollapsed ? 'w-16' : 'w-64';

  return (
    <div className={`hidden md:flex flex-col h-screen bg-white border-r border-gray-200 fixed inset-y-0 left-0 z-30 ${widthClass} transition-all duration-300`}>
      <div className="flex flex-col flex-1 min-h-0 w-full overflow-hidden">

        {/* Header with collapse arrow */}
        <div className="flex items-center justify-between h-16 px-4 bg-gray-100 border-b flex-shrink-0">
          {isCollapsed
            ? <Logo variant="icon" style={{ width: 40, height: 40 }} />
            : <Logo variant="icon" style={{ width: 80, height: 80 }} />}
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
        </div>

        {/* User info */}
        <div className={`border-b border-gray-200 flex-shrink-0 ${isCollapsed ? 'px-2 py-3' : 'px-4 py-4'}`}>
          <div className="flex flex-col items-center space-y-2">
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
              {!isCollapsed && (
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <label className="cursor-pointer text-white text-xs font-medium">
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
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
                <p className="text-xs text-gray-500">{user.points?.toLocaleString() || 0} points</p>
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

          {/* Admin-only section */}
          {['admin', 'founder'].includes(user?.userType) && (
            <>
              {!isCollapsed && (
                <div className="pt-3 pb-1 px-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Admin</p>
                </div>
              )}
              {isCollapsed && <div className="my-2 border-t border-gray-200" />}
              {adminNavigation.map((item) => {
                const isActive = location.pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    title={isCollapsed ? item.name : undefined}
                    className={`group flex items-center py-2 text-sm font-medium rounded-md transition-colors duration-150 ease-in-out ${
                      isCollapsed ? 'justify-center px-2' : 'px-2'
                    } ${
                      isActive
                        ? 'bg-purple-100 text-purple-900 border-r-2 border-purple-600'
                        : 'text-gray-600 hover:bg-purple-50 hover:text-purple-900'
                    }`}
                  >
                    <span className={`text-lg flex-shrink-0 ${!isCollapsed ? 'mr-3' : ''}`}>{item.icon}</span>
                    {!isCollapsed && <span>{item.name}</span>}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* Notifications + Logout */}
        <div className={`border-t border-gray-200 flex-shrink-0 py-2 ${isCollapsed ? 'px-1' : 'px-2'}`}>
          {/* Notification bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifs(prev => !prev)}
              title={isCollapsed ? `Notifications${unreadCount > 0 ? ` (${unreadCount})` : ''}` : undefined}
              className={`group flex items-center w-full py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900 transition-colors ${isCollapsed ? 'justify-center px-2' : 'px-2'}`}
            >
              <span className={`relative flex-shrink-0 ${!isCollapsed ? 'mr-3' : ''}`}>
                🔔
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold leading-none">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </span>
              {!isCollapsed && <span>Notifications {unreadCount > 0 && <span className="ml-auto bg-red-100 text-red-600 text-xs px-1.5 py-0.5 rounded-full font-medium">{unreadCount}</span>}</span>}
            </button>

            {/* Dropdown */}
            {showNotifs && (
              <div className={`absolute bottom-full mb-1 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden ${isCollapsed ? 'left-14 w-72' : 'left-0 right-0'}`}
                style={{ minWidth: 280 }}>
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-gray-500">No notifications yet</div>
                  ) : notifications.slice(0, 10).map(n => (
                    <div key={n.id}
                      onClick={() => !n.is_read && markRead(n.id)}
                      className={`px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${!n.is_read ? 'bg-blue-50' : ''}`}>
                      <div className={`text-sm font-medium ${!n.is_read ? 'text-gray-900' : 'text-gray-600'}`}>{n.title}</div>
                      {n.message && <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</div>}
                      <div className="text-xs text-gray-400 mt-1">
                        {new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleLogout}
            title={isCollapsed ? 'Logout' : undefined}
            className={`group flex items-center w-full py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900 transition-colors ${
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
