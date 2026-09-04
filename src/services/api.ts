import { Client, ServiceItem, Proposal, SystemSettings, DashboardMetrics, User } from '../types';

const BASE_URL = '/api';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    }
  });

  if (!response.ok) {
    let errorMsg = `Erro na requisição (${response.status})`;
    try {
      const data = await response.json();
      if (data?.error) errorMsg = data.error;
    } catch {}
    throw new Error(errorMsg);
  }

  return response.json();
}

export const api = {
  // Auth
  auth: {
    login: (data: { email?: string; password?: string; pin?: string; method: 'pin' | 'email' }) =>
      request<{ token: string; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    me: () => request<{ user: User }>('/auth/me')
  },

  // Dashboard
  dashboard: {
    getMetrics: () => request<DashboardMetrics>('/dashboard')
  },

  // Clients
  clients: {
    list: (search?: string) => request<Client[]>(`/clients${search ? `?search=${encodeURIComponent(search)}` : ''}`),
    get: (id: string) => request<Client>(`/clients/${id}`),
    create: (data: Partial<Client>) => request<Client>('/clients', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Client>) => request<Client>(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<{ message: string }>(`/clients/${id}`, { method: 'DELETE' })
  },

  // Services
  services: {
    list: (params?: { active?: boolean; category?: string; search?: string }) => {
      const q = new URLSearchParams();
      if (params?.active) q.set('active', 'true');
      if (params?.category) q.set('category', params.category);
      if (params?.search) q.set('search', params.search);
      const qs = q.toString();
      return request<ServiceItem[]>(`/services${qs ? `?${qs}` : ''}`);
    },
    get: (id: string) => request<ServiceItem>(`/services/${id}`),
    create: (data: Partial<ServiceItem>) => request<ServiceItem>('/services', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<ServiceItem>) => request<ServiceItem>(`/services/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<{ message: string }>(`/services/${id}`, { method: 'DELETE' })
  },

  // Proposals
  proposals: {
    getNextNumber: () => request<{ number: string; sequenceNumber: number; year: number; prefix: string }>('/proposals/next-number'),
    list: (params?: { search?: string; status?: string; startDate?: string; endDate?: string; responsible?: string }) => {
      const q = new URLSearchParams();
      if (params?.search) q.set('search', params.search);
      if (params?.status) q.set('status', params.status);
      if (params?.startDate) q.set('startDate', params.startDate);
      if (params?.endDate) q.set('endDate', params.endDate);
      if (params?.responsible) q.set('responsible', params.responsible);
      const qs = q.toString();
      return request<Proposal[]>(`/proposals${qs ? `?${qs}` : ''}`);
    },
    get: (id: string) => request<Proposal & { history?: any[] }>(`/proposals/${id}`),
    create: (data: any) => request<Proposal>('/proposals', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request<Proposal>(`/proposals/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    duplicate: (id: string) => request<Proposal>(`/proposals/${id}/duplicate`, { method: 'POST' }),
    updateStatus: (id: string, status: string, changedBy: string, reason?: string) =>
      request<Proposal>(`/proposals/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, changedBy, reason })
      }),
    markPdfGenerated: (id: string) => request<{ message: string }>(`/proposals/${id}/pdf-generated`, { method: 'PATCH' }),
    delete: (id: string) => request<{ message: string }>(`/proposals/${id}`, { method: 'DELETE' })
  },

  // Settings
  settings: {
    get: () => request<SystemSettings>('/settings'),
    update: (data: Partial<SystemSettings>) => request<SystemSettings>('/settings', { method: 'PUT', body: JSON.stringify(data) })
  },

  // Contracts
  contracts: {
    list: (params?: { search?: string; status?: string; proposalNumber?: string; responsible?: string }) => {
      const q = new URLSearchParams();
      if (params?.search) q.set('search', params.search);
      if (params?.status) q.set('status', params.status);
      if (params?.proposalNumber) q.set('proposalNumber', params.proposalNumber);
      if (params?.responsible) q.set('responsible', params.responsible);
      const qs = q.toString();
      return request<any[]>(`/contracts${qs ? `?${qs}` : ''}`);
    },
    get: (id: string) => request<any>(`/contracts/${id}`),
    createFromProposal: (proposalId: string, performedBy?: string) =>
      request<{ id: string; number: string; proposalNumber: string; status: string }>(`/contracts/from-proposal/${proposalId}`, {
        method: 'POST',
        body: JSON.stringify({ performedBy })
      }),
    update: (id: string, data: any) => request<{ success: boolean; message: string }>(`/contracts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    finalize: (id: string, performedBy?: string) =>
      request<{ success: boolean; message: string }>(`/contracts/${id}/finalize`, { method: 'POST', body: JSON.stringify({ performedBy }) }),
    send: (id: string, notes?: string, performedBy?: string) =>
      request<{ success: boolean; message: string }>(`/contracts/${id}/send`, { method: 'POST', body: JSON.stringify({ notes, performedBy }) }),
    sign: (id: string, data: { signatureDate?: string; signatureType?: string; signatureNotes?: string; performedBy?: string }) =>
      request<{ success: boolean; message: string; financialReleaseStatus: string }>(`/contracts/${id}/sign`, { method: 'POST', body: JSON.stringify(data) }),
    uploadSigned: (id: string, data: { fileName: string; fileType?: string; fileSize?: number; filePath?: string; notes?: string; performedBy?: string }) =>
      request<{ success: boolean; message: string }>(`/contracts/${id}/upload-signed`, { method: 'POST', body: JSON.stringify(data) }),
    newVersion: (id: string, reason?: string, performedBy?: string) =>
      request<{ success: boolean; message: string; newVersion: number }>(`/contracts/${id}/new-version`, { method: 'POST', body: JSON.stringify({ reason, performedBy }) })
  },

  // Contract Templates
  contractTemplates: {
    list: () => request<any[]>('/contract-templates'),
    get: (id: string) => request<any>('/contract-templates/' + id),
    update: (id: string, data: any) => request<{ success: boolean }>('/contract-templates/' + id, { method: 'PUT', body: JSON.stringify(data) }),
    updateClauses: (id: string, clauses: any[]) => request<{ success: boolean }>('/contract-templates/' + id + '/clauses', { method: 'PUT', body: JSON.stringify({ clauses }) })
  }
};

