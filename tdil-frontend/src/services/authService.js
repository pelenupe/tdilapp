import API from '../services/api';

export const register = (formData) => API.post('/auth/register', formData);
export const login = (formData) => API.post('/auth/login', formData);
export const linkedinAuth = () => API.get('/auth/linkedin');
