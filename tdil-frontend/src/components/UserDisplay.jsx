import { useUser } from '../contexts/UserContext';
import { getUserProfileImageUrl } from '../utils/profileImage';

// Centralized user display component - USE THIS EVERYWHERE for consistency
export function UserAvatar({ size = 'md', showOnlineStatus = false }) {
  const { user } = useUser();
  
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl'
  };

  const getProfileImage = () => {
    return getUserProfileImageUrl(user);
  };

  const getInitials = () => {
    if (!user) return '?';
    const first = user.firstName?.[0] || user.firstname?.[0] || '';
    const last = user.lastName?.[0] || user.lastname?.[0] || '';
    return (first + last).toUpperCase() || '?';
  };

  const profileImage = getProfileImage();

  return (
    <div className="relative inline-block">
      {profileImage ? (
        <img 
          src={profileImage} 
          alt={`${user?.firstName || user?.firstname || 'User'}'s profile`}
          className={`${sizeClasses[size]} rounded-full object-cover border-2 border-gray-200`}
          onError={(e) => {
            // Fallback to initials if image fails to load
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'flex';
          }}
        />
      ) : null}
      <div 
        className={`${sizeClasses[size]} rounded-full bg-blue-600 text-white font-semibold flex items-center justify-center border-2 border-gray-200`}
        style={{ display: profileImage ? 'none' : 'flex' }}
      >
        {getInitials()}
      </div>
      {showOnlineStatus && (
        <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-green-400 ring-2 ring-white" />
      )}
    </div>
  );
}

export function UserPoints({ showLabel = true, className = '' }) {
  const { user } = useUser();
  
  // Get points from user object - handle different property names
  const points = user?.points ?? 0;
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-2xl">⭐</span>
      <div className="flex flex-col">
        <span className="text-lg font-bold text-gray-900">{points.toLocaleString()}</span>
        {showLabel && <span className="text-xs text-gray-500">Points</span>}
      </div>
    </div>
  );
}

export function UserCard({ showPoints = true, showLevel = true, className = '' }) {
  const { user } = useUser();
  
  if (!user) return null;

  const getName = () => {
    const first = user.firstName || user.firstname || '';
    const last = user.lastName || user.lastname || '';
    return `${first} ${last}`.trim() || 'User';
  };

  const getLevel = () => {
    return user.level || 1;
  };

  const getPoints = () => {
    return user.points ?? 0;
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <UserAvatar size="md" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {getName()}
        </p>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {showLevel && <span>Level {getLevel()}</span>}
          {showLevel && showPoints && <span>•</span>}
          {showPoints && <span>{getPoints().toLocaleString()} pts</span>}
        </div>
      </div>
    </div>
  );
}

// Helper function to get consistent user data - USE THIS in components
export function useUserData() {
  const { user } = useUser();
  
  return {
    id: user?.id,
    firstName: user?.firstName || user?.firstname || '',
    lastName: user?.lastName || user?.lastname || '',
    fullName: `${user?.firstName || user?.firstname || ''} ${user?.lastName || user?.lastname || ''}`.trim() || 'User',
    email: user?.email || '',
    points: user?.points ?? 0,
    level: user?.level || 1,
    profileImage: user?.profileImage || user?.profile_image || null,
    userType: user?.userType || user?.usertype || 'member',
    company: user?.company || '',
    jobTitle: user?.jobTitle || user?.jobtitle || '',
  };
}
