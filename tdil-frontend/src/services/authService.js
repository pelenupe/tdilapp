import API from '../services/api';

// Authentication API calls
export const register = (formData) => API.post('/auth/register', formData);
export const login = (formData) => API.post('/auth/login', formData);
export const me = () => API.get('/auth/me');
export const linkedinAuth = () => API.get('/auth/linkedin');

// Local storage management
export const getToken = () => localStorage.getItem('token');
export const getUser = () => {
  try {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
};

export const setAuth = (token, user) => {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login';
};

export const isAuthenticated = () => {
  const token = getToken();
  return token && token !== 'demo-token';
};
