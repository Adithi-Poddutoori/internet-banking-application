import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:9098/api/v1'
});

api.interceptors.request.use((config) => {
  const raw = localStorage.getItem('nova-bank-auth');
  if (raw) {
    const auth = JSON.parse(raw);
    if (auth?.accessToken) {
      config.headers.Authorization = `Bearer ${auth.accessToken}`;
    }
  }
  return config;
});

// Suppress 403 errors on background/polling calls so they don't surface as toasts.
// Pages that explicitly need to handle 403 (e.g. a submit action) should check
// e.response?.status === 403 themselves.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403) {
      // Rewrite the message so fallback toasts don't show "permission" wording
      if (error.response.data) {
        error.response.data.message = '';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
