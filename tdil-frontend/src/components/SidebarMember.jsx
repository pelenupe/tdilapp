import { Link, useLocation } from 'react-router-dom';
import { memberNavigation } from '../config/navigation';
import { useUser } from '../contexts/UserContext';
import Logo from './Logo';

export default function SidebarMember() {
  const { user, clearUser, updateUser } = useUser();
  const location = useLocation();

  const handleLogout = () => {
    clearUser();
    window.location.href = '/login';
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
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
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        
        // Update user context with new profile image
        updateUser({
          profileImage: result.user.profileImage
        });

        alert('Profile picture updated successfully!');
      } else {
        const error = await response.json();
        console.error('Upload failed:', error);
        alert(error.message || 'Failed to upload profile picture');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload profile picture. Please try again.');
    }
  };

  if (!user) return null;

  return (
    <div className="hidden lg:flex h-screen bg-gray-100 fixed inset-y-0 left-0 z-30 w-64">
        <div className="flex flex-col flex-1 min-h-0 bg-white border-r border-gray-200">
          {/* Header */}
          <div className="flex items-center justify-between h-16 px-4 bg-gray-100 border-b">
            <Logo variant="compact" size="md" />
          </div>

          {/* User info with Profile Picture Upload */}
          <div className="px-4 py-4 border-b border-gray-200">
            <div className="flex flex-col items-center space-y-3">
              <div className="relative group">
                {user.profileImage ? (
                  <img 
                    src={user.profileImage} 
                    alt={`${user.firstName} ${user.lastName}`}
                    className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                  />
                ) : (
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center border-2 border-gray-200">
                    <span className="text-blue-600 font-semibold text-lg">
                      {user.firstName?.[0]}{user.lastName?.[0]}
                    </span>
                  </div>
                )}
                
                {/* Upload Overlay */}
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
              </div>
              
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">
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
