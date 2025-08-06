import API from './api';

export const getMembers = () => API.get('/members');
export const getProfile = (id) => API.get(`/members/${id}`);

export const updateProfile = (formData) => {
  return API.put('/members/update', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};
