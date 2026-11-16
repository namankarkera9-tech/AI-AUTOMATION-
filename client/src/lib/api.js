import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT from localStorage on every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('agentflow_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Global response error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('agentflow_token');
        localStorage.removeItem('agentflow_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ─── Auth ───────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  updateMe: (data) => api.patch('/auth/me', data),
};

// ─── Workflows ──────────────────────────────────────────────────────────────
export const workflowAPI = {
  dashboard: () => api.get('/workflows/dashboard'),
  list: (params = {}) => api.get('/workflows', { params }),
  get: (id) => api.get(`/workflows/${id}`),
  create: (data) => api.post('/workflows', data),
  generate: (prompt) => api.post('/workflows/generate', { prompt }),
  update: (id, data) => api.put(`/workflows/${id}`, data),
  duplicate: (id) => api.post(`/workflows/${id}/duplicate`),
  execute: (id, input = {}) => api.post(`/workflows/${id}/execute`, { input }),
  validate: (id) => api.post(`/workflows/${id}/validate`),
  versions: (id) => api.get(`/workflows/${id}/versions`),
  restoreVersion: (id, version) => api.post(`/workflows/${id}/versions/${version}/restore`),
  delete: (id) => api.delete(`/workflows/${id}`),
};

// ─── Executions ─────────────────────────────────────────────────────────────
export const executionAPI = {
  list: (params = {}) => api.get('/executions', { params }),
  get: (id) => api.get(`/executions/${id}`),
  timeline: (id) => api.get(`/executions/${id}/timeline`),
  pause: (id) => api.post(`/executions/${id}/pause`),
  resume: (id) => api.post(`/executions/${id}/resume`),
  cancel: (id) => api.post(`/executions/${id}/cancel`),
  retry: (id) => api.post(`/executions/${id}/retry`),
};

// ─── Integrations ───────────────────────────────────────────────────────────
export const integrationAPI = {
  list: () => api.get('/integrations'),
  status: () => api.get('/integrations/status'),
  oauthStart: (provider) => api.get(`/integrations/oauth/${provider}/start`),
  save: (data) => api.post('/integrations', data),
  test: (provider) => api.post(`/integrations/${provider}/test`),
  setEnabled: (provider, enabled) => api.patch(`/integrations/${provider}/enabled`, { enabled }),
};

// ─── Notifications ──────────────────────────────────────────────────────────
export const notificationAPI = {
  list: () => api.get('/notifications'),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
};

// ─── Health ─────────────────────────────────────────────────────────────────
export const healthAPI = {
  check: () => api.get('/health').catch(() => null),
};

export default api;
