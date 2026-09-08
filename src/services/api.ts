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
  },

  // Financial Module
  financial: {
    getOverview: () => request<any>('/financial/overview'),
    getAccounts: () => request<any[]>('/financial/accounts'),
    getCategories: (params?: { type?: string; all?: boolean }) => {
      const q = new URLSearchParams();
      if (params?.type) q.set('type', params.type);
      if (params?.all) q.set('all', 'true');
      const qs = q.toString();
      return request<any[]>(`/financial/categories${qs ? `?${qs}` : ''}`);
    },
    createCategory: (data: { name: string; type?: string; color?: string }) =>
      request<any>('/financial/categories', { method: 'POST', body: JSON.stringify(data) }),
    updateCategory: (id: string, data: { name?: string; color?: string; isActive?: boolean }) =>
      request<{ success: boolean }>('/financial/categories/' + id, { method: 'PUT', body: JSON.stringify(data) }),
    toggleCategory: (id: string) =>
      request<{ success: boolean; isActive: number }>('/financial/categories/' + id + '/toggle', { method: 'PATCH' }),

    // Receivables
    getReceivables: (params?: any) => {
      const q = new URLSearchParams();
      if (params) {
        Object.keys(params).forEach(k => {
          if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
            q.set(k, String(params[k]));
          }
        });
      }
      const qs = q.toString();
      return request<any[]>(`/financial/receivables${qs ? `?${qs}` : ''}`);
    },
    getReceivable: (id: string) => request<any>('/financial/receivables/' + id),
    getReceivableByContract: (contractId: string) => request<{ exists: boolean; receivable?: any }>('/financial/receivables/by-contract/' + contractId),
    generateFromContract: (contractId: string, data: any) =>
      request<{ success: boolean; message: string; receivableId: string; code: string; installmentsCount: number; finalAmount: number }>(
        `/financial/receivables/from-contract/${contractId}`,
        { method: 'POST', body: JSON.stringify(data) }
      ),
    createManualReceivable: (data: any) =>
      request<{ success: boolean; message: string; receivableId: string; code: string }>('/financial/receivables/manual', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    registerReceipt: (receivableId: string, installmentId: string, data: any) =>
      request<{ success: boolean; message: string; receiptId: string; receiptNumber: string; newBalance: number; status: string }>(
        `/financial/receivables/${receivableId}/installments/${installmentId}/receipt`,
        { method: 'POST', body: JSON.stringify(data) }
      ),
    reverseReceipt: (receivableId: string, receiptId: string, data: { reason: string; performedBy?: string }) =>
      request<{ success: boolean; message: string }>(
        `/financial/receivables/${receivableId}/receipts/${receiptId}/reverse`,
        { method: 'POST', body: JSON.stringify(data) }
      ),
    updateReceivableInstallment: (instId: string, data: any) =>
      request<{ success: boolean; message: string }>(`/financial/receivables/installments/${instId}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      }),
    cancelReceivableInstallment: (instId: string, data: { reason: string; performedBy?: string }) =>
      request<{ success: boolean; message: string }>(`/financial/receivables/installments/${instId}/cancel`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    // Payables
    getPayables: (params?: any) => {
      const q = new URLSearchParams();
      if (params) {
        Object.keys(params).forEach(k => {
          if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
            q.set(k, String(params[k]));
          }
        });
      }
      const qs = q.toString();
      return request<any[]>(`/financial/payables${qs ? `?${qs}` : ''}`);
    },
    getPayable: (id: string) => request<any>('/financial/payables/' + id),
    createPayable: (data: any) =>
      request<{ success: boolean; message: string; payableId: string; code: string; totalAmount: number; installmentsCount: number }>(
        '/financial/payables',
        { method: 'POST', body: JSON.stringify(data) }
      ),
    duplicatePayable: (id: string) =>
      request<{ success: boolean; message: string; payableId: string; code: string }>(`/financial/payables/${id}/duplicate`, {
        method: 'POST'
      }),
    registerPayment: (payableId: string, installmentId: string, data: any) =>
      request<{ success: boolean; message: string; paymentId: string; newBalance: number; status: string }>(
        `/financial/payables/${payableId}/installments/${installmentId}/payment`,
        { method: 'POST', body: JSON.stringify(data) }
      ),
    reversePayment: (payableId: string, paymentId: string, data: { reason: string; performedBy?: string }) =>
      request<{ success: boolean; message: string }>(`/financial/payables/${payableId}/payments/${paymentId}/reverse`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    // Event Results
    getEventsResults: () => request<any[]>('/financial/events-results'),
    getEventResultDetails: (eventName: string) => request<any>('/financial/events-results/' + encodeURIComponent(eventName)),

    // Cash Flow
    getCashFlow: (params?: any) => {
      const q = new URLSearchParams();
      if (params) {
        Object.keys(params).forEach(k => {
          if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
            q.set(k, String(params[k]));
          }
        });
      }
      const qs = q.toString();
      return request<any>(`/financial/cash-flow${qs ? `?${qs}` : ''}`);
    },

    // Official Receipts
    issueReceiptDocument: (receiptId: string) =>
      request<{ success: boolean; document: any; message: string }>(`/financial/receipts/${receiptId}/issue`, {
        method: 'POST'
      }),
    getReceiptDocument: (docId: string) => request<any>(`/financial/receipts/document/${docId}`),

    // Settings
    getSettings: () => request<any>('/financial/settings'),
    updateSettings: (data: any) => request<{ success: boolean; message: string }>('/financial/settings', {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }
};


