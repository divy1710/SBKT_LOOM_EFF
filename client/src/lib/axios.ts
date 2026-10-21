import axios from 'axios';

/**
 * Axios instance pre-configured with the backend API base URL.
 * Reads VITE_API_URL so no hardcoded localhost in application code.
 */
const apiClient = axios.create({
  baseURL: import.meta.env['VITE_API_URL'] ?? '/api/v1',
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // Required for HttpOnly cookie auth
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
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default apiClient;
