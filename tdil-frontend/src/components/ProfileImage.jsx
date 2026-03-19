import { useState } from 'react';

export default function ProfileImage({ 
  src, 
  firstName = '', 
  lastName = '', 
  size = 'md',
  className = '' 
}) {
  const [imageError, setImageError] = useState(false);

  const getInitials = () => {
    const first = firstName?.[0] || '';
    const last = lastName?.[0] || '';
    return `${first}${last}`.toUpperCase() || '?';
  };

  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-12 h-12 text-lg',
    lg: 'w-14 h-14 text-lg',
    xl: 'w-24 h-24 text-2xl'
  };

  const sizeClass = sizeClasses[size] || sizeClasses.md;

  if (!src || imageError) {
    return (
      <div className={`${sizeClass} rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold flex-shrink-0 ${className}`}>
        {getInitials()}
      </div>
    );
  }

  return (
    <img 
      src={src} 
      alt={`${firstName} ${lastName}`}
      className={`${sizeClass} rounded-full object-cover flex-shrink-0 ${className}`}
      onError={() => setImageError(true)}
    />
  );
}
