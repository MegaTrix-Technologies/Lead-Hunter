import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach Authorization Bearer token to all outbound requests
api.interceptors.request.use((config) => {
  try {
    const session = localStorage.getItem('megatrix_auth_session');
    if (session) {
      const parsed = JSON.parse(session);
      if (parsed?.token) {
        config.headers.Authorization = `Bearer ${parsed.token}`;
      }
    }
  } catch (e) {
    // Ignore parse error
  }
  return config;
}, (error) => Promise.reject(error));

export const AuthService = {
  login: (credentials) => api.post('/auth/login', credentials),
  getMe: () => api.get('/auth/me'),
  changePassword: (data) => api.post('/auth/change-password', data),
  getCurrentUser: () => {
    try {
      const session = localStorage.getItem('megatrix_auth_session');
      return session ? JSON.parse(session) : null;
    } catch (e) {
      return null;
    }
  }
};

export const UserService = {
  getUsers: () => api.get('/users'),
  createUser: (data) => api.post('/users', data),
  updateUser: (id, data) => api.patch(`/users/${id}`, data),
  deleteUser: (id) => api.delete(`/users/${id}`),
  getUsageBreakdown: () => api.get('/users/usage-breakdown')
};

export const DatasetService = {
  getDatasets: () => api.get('/datasets'),
  getDatasetById: (id, params) => api.get(`/datasets/${id}`, { params }),
  updateDataset: (id, data) => api.patch(`/datasets/${id}`, data),
  deleteDataset: (id) => api.delete(`/datasets/${id}`),
  appendLeads: (id, payload) => api.post(`/datasets/${id}/append`, payload),
  getDatasetQueue: (id) => api.get(`/datasets/${id}/queue`),
  exportDataset: (id) => api.get(`/datasets/${id}/export`, { responseType: 'blob' }),
  exportDatasetPdf: (id) => api.get(`/datasets/${id}/export-pdf`, { responseType: 'blob' })
};

export const LeadService = {
  getLeads: (params) => api.get('/leads', { params }),
  getCallingQueue: (params) => api.get('/leads/queue', { params }),
  getLeadById: (id) => api.get(`/leads/${id}`),
  updateCallStatus: (id, data) => api.patch(`/leads/${id}/call-status`, data),
  addCallNote: (id, data) => api.post(`/leads/${id}/notes`, data),
  createLead: (data) => api.post('/leads', data),
  deleteLead: (id) => api.delete(`/leads/${id}`),
  bulkDelete: (ids) => api.post('/leads/bulk-delete', { ids }),
  exportLeads: (params) => api.get('/leads/export', { params, responseType: params.format === 'csv' ? 'blob' : 'json' })
};

export const ScraperService = {
  scrapeLeads: (payload) => api.post('/scraper/scrape', payload),
  autocompleteArea: (input) => api.get('/scraper/autocomplete-area', { params: { input } }),
  getScrapeJobs: () => api.get('/scraper/jobs'),
  getQuota: () => api.get('/scraper/quota')
};

export const EmailService = {
  getTemplates: () => api.get('/email/templates'),
  createTemplate: (data) => api.post('/email/templates', data),
  updateTemplate: (id, data) => api.put(`/email/templates/${id}`, data),
  deleteTemplate: (id) => api.delete(`/email/templates/${id}`),
  launchCampaign: (data) => api.post('/email/campaign', data),
  getActiveReport: () => api.get('/email/campaign/active')
};

export const AnalyticsService = {
  getAnalytics: () => api.get('/analytics'),
  getQuotas: () => api.get('/analytics/quotas')
};

export const ProductService = {
  getProducts: () => api.get('/products'),
  createProduct: (data) => api.post('/products', data),
  updateProduct: (id, data) => api.patch(`/products/${id}`, data),
  deleteProduct: (id) => api.delete(`/products/${id}`)
};

export default api;
