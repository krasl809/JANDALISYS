import axios from 'axios';

// Use /api directly since we're using Vite proxy
const API_BASE_URL = '/api';

console.log('Final API Base URL:', API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    if (import.meta.env.DEV) {
      console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    }
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle token expiration and server errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle Network Errors (Server Down)
    if (!error.response) {
      // Only redirect to offline if it's a critical GET request that failed
      // and not a transient error like ERR_ABORTED
      if (error.code === 'ECONNABORTED' || error.message === 'Network Error') {
        console.error('❌ Network Error: Backend server might be down or connection aborted');
        if (!window.location.pathname.includes('/offline')) {
          // window.location.href = '/offline'; // Commented out to be less aggressive
        }
      }
      return Promise.reject(error);
    }

    if (error.response?.status === 401) {
      // Check if user is not already on login page
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_id');
        localStorage.removeItem('user_role');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Utility function to validate contract access before navigation
export const validateContractAccess = async (contractId: string): Promise<boolean> => {
  try {
    const response = await api.get(`/contracts/${contractId}`);
    return response.status === 200;
  } catch (error: any) {
    console.warn(`Contract ${contractId} access validation failed:`, error.response?.status);
    return false;
  }
};

export default api;