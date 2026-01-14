import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authApi = {
  register: (data: { email: string; name: string; password: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
};

// Ledger API
export const ledgerApi = {
  getBalance: () => api.get('/ledger/balance'),
  getEntries: (limit?: number, offset?: number) =>
    api.get('/ledger/entries', { params: { limit, offset } }),
  createEntry: (data: any) => api.post('/ledger/entries', data),
};

// Flow API
export const flowApi = {
  listFlows: (isActive?: boolean) =>
    api.get('/flows', { params: { isActive } }),
  getFlow: (id: string) => api.get(`/flows/${id}`),
  createFlow: (data: any) => api.post('/flows', data),
  updateFlow: (id: string, data: any) => api.put(`/flows/${id}`, data),
  deleteFlow: (id: string) => api.delete(`/flows/${id}`),
  executeFlow: (id: string, context?: any) =>
    api.post(`/flows/${id}/execute`, context),
  getExecutions: (id: string, limit?: number, offset?: number) =>
    api.get(`/flows/${id}/executions`, { params: { limit, offset } }),
};

// Referral API
export const referralApi = {
  createReferral: (data: { referredEmail: string; referredName: string }) =>
    api.post('/referrals', data),
  completeReferral: (code: string) =>
    api.post('/referrals/complete', { code }),
  getMyReferrals: () => api.get('/referrals/my'),
  getStats: () => api.get('/referrals/stats'),
};
