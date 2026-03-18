import axios from 'axios';

const API_URL = import.meta.env.VITE_API_BASE || '';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
});

// Auto-attach JWT to all requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token expiration
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      // Only redirect if we're not already on the login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  // Initiate Google OAuth
  loginWithGoogle() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    window.location.href = `${API_URL}/auth/google`;
  },

  // Handle local signup
  async signup(payload) {
    const response = await apiClient.post('/auth/signup', payload);
    if (response.data.token) {
      localStorage.setItem('authToken', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  // Handle local login
  async login(payload) {
    const response = await apiClient.post('/auth/login', payload);
    if (response.data.token) {
      localStorage.setItem('authToken', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  // Verify token and get user
  async verifyToken() {
    const response = await apiClient.post('/api/verify-token');
    return response.data;
  },

  // Get current user
  async getCurrentUser() {
    const response = await apiClient.get('/auth/user');
    return response.data.user;
  },

  // Logout
  logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
  },

  // Check authentication status (locally)
  isAuthenticated() {
    return !!localStorage.getItem('authToken');
  }
};

export default apiClient;
