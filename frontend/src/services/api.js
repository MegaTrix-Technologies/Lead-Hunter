import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

export const AuthService = {
  login: (credentials) => api.post('/auth/login', credentials)
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
  getScrapeJobs: () => api.get('/scraper/jobs')
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

export default api;
