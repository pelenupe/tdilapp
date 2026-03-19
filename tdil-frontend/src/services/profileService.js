import API from './api';

// Get current user's profile
export const getMyProfile = () => API.get('/members/me');

// Get any user's profile by ID
export const getProfile = (userId) => API.get(`/members/${userId}`);

// Update current user's profile
export const updateProfile = (profileData) => {
  const formData = new FormData();
  
  // Add text fields
  Object.keys(profileData).forEach(key => {
    if (profileData[key] !== null && profileData[key] !== undefined && key !== 'profilePic') {
      formData.append(key, profileData[key]);
    }
  });
  
  // Add file if present
  if (profileData.profilePic) {
    formData.append('profilePic', profileData.profilePic);
  }
  
  return API.put('/members/update', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
};

// Get all members
export const getMembers = (filters = {}) => {
  const params = new URLSearchParams(filters);
  return API.get(`/members?${params}`);
};
