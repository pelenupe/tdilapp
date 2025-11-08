import { useState } from 'react';
import { useUser } from '../contexts/UserContext';

export default function ProfilePictureUpload({ currentImage, onImageUpdate }) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(currentImage);
  const { user, updateUser } = useUser();

  const handleFileSelect = async (event) => {
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

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target.result);
    };
    reader.readAsDataURL(file);

    // Upload to backend
    await uploadProfilePicture(file);
  };

  const uploadProfilePicture = async (file) => {
    try {
      setUploading(true);

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
        const updatedUser = result.user;
        
        // Update user context with new profile image
        updateUser({
          profileImage: updatedUser.profileImage
        });

        // Update preview with actual uploaded URL
        setPreviewUrl(updatedUser.profileImage);
        
        if (onImageUpdate) {
          onImageUpdate(updatedUser.profileImage);
        }

        alert('Profile picture updated successfully!');
      } else {
        const error = await response.json();
        console.error('Upload failed:', error);
        
        // Reset preview on error
        setPreviewUrl(currentImage);
        
        if (error.message.includes('AWS') || error.message.includes('S3')) {
          alert('Image upload service is not configured. Please contact an administrator.');
        } else {
          alert(error.message || 'Failed to upload profile picture');
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      setPreviewUrl(currentImage);
      alert('Failed to upload profile picture. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const getInitials = () => {
    if (!user) return '?';
    return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`;
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative group">
        {/* Profile Image Display */}
        <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 border-4 border-white shadow-lg">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl">
              {getInitials()}
            </div>
          )}
        </div>

        {/* Upload Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {uploading ? (
            <div className="text-white text-sm font-medium">Uploading...</div>
          ) : (
            <label className="cursor-pointer text-white text-sm font-medium">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                disabled={uploading}
              />
              📷 Change
            </label>
          )}
        </div>

        {/* Upload Progress Indicator */}
        {uploading && (
          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2">
            <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
          </div>
        )}
      </div>

      {/* Upload Instructions */}
      <p className="text-sm text-gray-500 mt-2 text-center">
        Click to upload a new profile picture
        <br />
        <span className="text-xs">JPG, PNG, GIF up to 5MB</span>
      </p>
    </div>
  );
}
