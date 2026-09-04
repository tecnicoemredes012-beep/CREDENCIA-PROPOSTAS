export type ProposalStatus =
  | 'draft'
  | 'generated'
  | 'sent'
  | 'negotiating'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'expired';

export interface User {
  id: string;
  name: string;
  email: string;
  pin?: string;
  role: 'ADMIN' | 'OPERATOR';
}

export interface Client {
  id: string;
  name: string; // Razão social ou Nome
  tradeName?: string; // Nome fantasia
  document: string; // CPF ou CNPJ
  contactPerson: string; // Responsável
  role?: string; // Cargo
  email: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  notes?: string;
  isDeleted?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceItem {
  id: string;
  name: string;
  defaultDescription: string;
  category: string;
  unit: string;
  unitPrice: number;
  commercialNotes?: string;
  isActive: boolean;
  isDeleted?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProposalItem {
  id: string;
  proposalId?: string;
  serviceId?: string;
  orderIndex: number;
  serviceName: string;
  description: string;
  unit: string;
  unitPrice: number;
  quantity: number;
  discount: number;
  total: number;
}

export interface Proposal {
  id: string;
  number: string;
  sequenceNumber: number;
  year: number;
  status: ProposalStatus;
  issueDate: string;
  validityDays: number;
  dueDate: string;
  responsibleName: string;
  clientId: string;
  clientSnapshot: Client;
  eventName: string;
  eventStartDate?: string;
  eventEndDate?: string;
  eventLocation?: string;
  eventCity?: string;
  eventState?: string;
  estimatedAttendees?: number;
  eventNotes?: string;
  items: ProposalItem[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  additionalAmount: number;
  finalAmount: number;
  paymentMethod: string;
  paymentTerms: string;
  financialNotes?: string;
  internalNotes?: string;
  termsAndConditions?: string;
  pdfGeneratedAt?: string;
  approvedAt?: string;
  cancelledAt?: string;
  isDeleted?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProposalStatusHistory {
  id: string;
  proposalId: string;
  previousStatus?: string;
  newStatus: string;
  changedBy: string;
  reason?: string;
  createdAt: string;
}

export interface SystemSettings {
  id: string;
  companyName: string;
  tradeName: string;
  cnpj: string;
  stateRegistration?: string;
  municipalRegistration?: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  logoUrl?: string;
  legalRepresentative?: string;
  legalRepresentativeCpf?: string;
  legalRepresentativeRole?: string;
  legalRepresentativeEmail?: string;
  legalRepresentativePhone?: string;
  defaultCourt?: string;
  defaultSignatureCity?: string;
  contractPrefix?: string;
  allowFinancialWithoutContract?: boolean | number;
  proposalPrefix: string;
  defaultValidityDays: number;
  defaultDiscountPercent: number;
  defaultPaymentTerms: string;
  footerText: string;
  generalConditions: string;
  updatedAt: string;
}

export interface DashboardMetrics {
  totalProposals: number;
  draftProposals: number;
  sentProposals: number;
  approvedProposals: number;
  expiredProposals: number;
  totalApprovedAmount: number;
  recentProposals: Proposal[];
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

export * from './contract';

