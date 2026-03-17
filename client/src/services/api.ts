import axios from 'axios';

// Use VITE_API_URL if available, otherwise fallback to /api for Vite proxy
const VITE_API_URL = import.meta.env.VITE_API_URL;
const API_BASE_URL = VITE_API_URL && VITE_API_URL !== '/api' 
  ? (VITE_API_URL.endsWith('/') ? VITE_API_URL : `${VITE_API_URL}/`)
  : '/api/';

if (import.meta.env.DEV) {
  console.log(`🌐 API Base URL configured as: ${API_BASE_URL}`);
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // 5 minutes for long operations
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
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
      // Check if this is an actual authentication issue vs. other errors
      const token = localStorage.getItem('access_token');
      const isLoginRequest = error.config?.url?.includes('/login') || error.config?.url?.includes('/auth');
      const isPublicEndpoint = error.config?.url?.includes('/public/');
      
      // Only log out if:
      // 1. User had a token (was logged in)
      // 2. This is not a login request
      // 3. This is not a public endpoint
      // 4. User is not already on login page
      if (token && !isLoginRequest && !isPublicEndpoint && !window.location.pathname.includes('/login')) {
        console.warn('401 error on protected endpoint - clearing auth and redirecting to login');
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_id');
        localStorage.removeItem('user_role');
        window.location.href = '/login';
      } else {
        // For other 401 cases (no token, public endpoint, login request), just reject without redirect
        console.warn('401 error but not redirecting:', {
          hasToken: !!token,
          isLoginRequest,
          isPublicEndpoint,
          currentPath: window.location.pathname
        });
      }
    }
    return Promise.reject(error);
  }
);

// Utility function to validate contract access before navigation
export const validateContractAccess = async (contractId: string): Promise<boolean> => {
  try {
    const response = await api.get(`contracts/${contractId}`);
    return response.status === 200;
  } catch (error: any) {
    console.warn(`Contract ${contractId} access validation failed:`, error.response?.status);
    return false;
  }
};

export default api;