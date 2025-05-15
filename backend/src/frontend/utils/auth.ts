import axios from 'axios';

const API_BASE = '/api/admin';

const authApi = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercept requests to add the token
authApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Intercept 401 responses and redirect to login
authApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export const login = async (email: string, password: string) => {
  try {
    const response = await authApi.post('/auth/login', { email, password });
    const { access_token, admin } = response.data;

    // Store token in localStorage
    localStorage.setItem('auth_token', access_token);
    localStorage.setItem('admin_data', JSON.stringify(admin));

    return admin;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};

export const logout = () => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('admin_data');
  window.location.href = '/login';
};

export const refreshToken = async () => {
  try {
    const response = await authApi.post('/auth/refresh');
    const { access_token } = response.data;

    // Update token in localStorage
    localStorage.setItem('auth_token', access_token);

    return true;
  } catch (error) {
    console.error('Token refresh failed:', error);
    logout();
    return false;
  }
};

export const getCurrentAdmin = () => {
  const adminData = localStorage.getItem('admin_data');
  return adminData ? JSON.parse(adminData) : null;
};

export const isAuthenticated = () => {
  return !!localStorage.getItem('auth_token');
};

// Replace the default axios instance with the authenticated one
export default authApi;
