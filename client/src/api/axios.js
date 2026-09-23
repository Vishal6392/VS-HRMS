import axios from 'axios';
import { mockHandleRequest } from './mockService';

const isGitHubPages =
  typeof window !== 'undefined' &&
  (window.location.hostname.includes('github.io') || window.location.hostname.includes('pages.dev'));

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to requests if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('hrms_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // If on GitHub Pages, use in-browser mock adapter directly
    if (isGitHubPages) {
      config.adapter = async (cfg) => {
        const mockRes = await mockHandleRequest(cfg);
        if (mockRes.status >= 200 && mockRes.status < 300) {
          return {
            data: mockRes.data,
            status: mockRes.status,
            statusText: 'OK',
            headers: {},
            config: cfg,
          };
        } else {
          const err = new Error(mockRes.data?.message || 'Mock Error');
          err.response = { data: mockRes.data, status: mockRes.status };
          throw err;
        }
      };
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Catch 401 Unauthorized globally
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // If backend connection refused (e.g. static host without server), fallback to mock
    if (
      error.code === 'ERR_NETWORK' ||
      error.message?.includes('Network Error') ||
      (error.response && error.response.status === 404)
    ) {
      try {
        const mockRes = await mockHandleRequest(error.config);
        if (mockRes.status >= 200 && mockRes.status < 300) {
          return { data: mockRes.data, status: mockRes.status };
        }
      } catch (mockErr) {
        // Fall through
      }
    }

    if (error.response && error.response.status === 401) {
      localStorage.removeItem('hrms_token');
      localStorage.removeItem('hrms_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
