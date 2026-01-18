import axios from 'axios';

// In production, use relative paths (same origin)
// In development, use localhost:5001
const getBaseUrl = () => {
  // If we're on the production server (not localhost), use relative path
  if (typeof window !== 'undefined' && !window.location.hostname.includes('localhost')) {
    return '/api';
  }
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';
};

const API = axios.create({
  baseURL: getBaseUrl(),
  timeout: 10000,
});

// Request interceptor - attach token if exists
API.interceptors.request.use(
  (req) => {
    const token = localStorage.getItem('token');
    if (token) {
      req.headers.Authorization = `Bearer ${token}`;
    }
    return req;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle common errors
API.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default API;
