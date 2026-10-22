import axios from 'axios';

/**
 * Axios instance pre-configured with the backend API base URL.
 * Reads VITE_API_URL so no hardcoded localhost in application code.
 */
const resolveBaseUrl = (): string => {
  const envUrl = import.meta.env['VITE_API_URL'];
  if (!envUrl) return '/api/v1';
  const clean = envUrl.replace(/\/+$/, '');
  if (clean.endsWith('/api/v1')) return clean;
  if (clean.endsWith('/api')) return `${clean}/v1`;
  return `${clean}/api/v1`;
};

/**
 * Axios instance pre-configured with the backend API base URL.
 * Reads VITE_API_URL so no hardcoded localhost in application code.
 */
const apiClient = axios.create({
  baseURL: resolveBaseUrl(),
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // Required for HttpOnly cookie auth
});

// ─── Request Interceptor ──────────────────────────────────────────────────────
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('sbkt_token');
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response Interceptor ─────────────────────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    // On 401, redirect to login (token expired or missing)
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      !window.location.pathname.startsWith('/login')
    ) {
      localStorage.removeItem('sbkt_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default apiClient;
