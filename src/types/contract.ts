export type ContractStatus =
  | 'draft'
  | 'in_review'
  | 'finalized'
  | 'sent'
  | 'viewed'
  | 'signed'
  | 'active'
  | 'cancelled'
  | 'closed'
  | 'replaced';

export type SignatureType = 'physical' | 'external_electronic' | 'digital_certificate' | 'other';

export interface ContractClause {
  id: string;
  contractId?: string;
  templateId?: string;
  versionNumber?: number;
  clauseNumber: number;
  title: string;
  content: string;
  orderIndex: number;
  isActive: boolean;
  isMandatory: boolean;
}

export interface ContractVersion {
  id: string;
  contractId: string;
  versionNumber: number;
  title: string;
  reason?: string;
  contentSnapshot: string;
  isCurrent: boolean;
  createdBy: string;
  createdAt: string;
}

export interface ContractAttachment {
  id: string;
  contractId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
  versionNumber: number;
  uploadedBy: string;
  notes?: string;
  createdAt: string;
}

export interface ContractStatusHistory {
  id: string;
  contractId: string;
  previousStatus?: string;
  newStatus: ContractStatus;
  action: string;
  details?: string;
  performedBy: string;
  createdAt: string;
}

export interface ContractSignatories {
  clientSignerName?: string;
  clientSignerCpf?: string;
  clientSignerRole?: string;
  contractorSignerName?: string;
  contractorSignerCpf?: string;
  contractorSignerRole?: string;
  witness1Name?: string;
  witness1Cpf?: string;
  witness2Name?: string;
  witness2Cpf?: string;
}

export interface Contract {
  id: string;
  number: string;
  sequenceNumber: number;
  year: number;
  proposalId: string;
  proposalNumber: string;
  templateId?: string;
  templateName: string;
  title: string;
  status: ContractStatus;
  currentVersion: number;
  clientSnapshot: any;
  contractorSnapshot: any;
  eventSnapshot: any;
  proposalSnapshot: any;
  servicesSnapshot: any;
  signatoriesSnapshot?: ContractSignatories | null;
  signatureDate?: string;
  signatureCity?: string;
  signatureType?: SignatureType;
  signatureNotes?: string;
  signedDocumentPath?: string;
  signedDocumentName?: string;
  signedDocumentSize?: number;
  signedUploadedAt?: string;
  signedUploadedBy?: string;
  sentAt?: string;
  sentBy?: string;
  finalizedAt?: string;
  finalizedBy?: string;
  signedAt?: string;
  signedBy?: string;
  financialReleaseStatus: 'pending' | 'ready_for_release' | 'released';
  financialReleasedAt?: string;
  financialReleasedBy?: string;
  proposalUpdatedAtAtGeneration: string;
  proposalWasModified?: boolean;
  proposalCurrentUpdatedAt?: string;
  clauses?: ContractClause[];
  versions?: ContractVersion[];
  attachments?: ContractAttachment[];
  history?: ContractStatusHistory[];
  isDeleted?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateClause {
  id?: string;
  templateId?: string;
  clauseNumber?: string;
  title: string;
  content: string;
  displayOrder?: number;
  isMandatory?: boolean;
  isActive?: boolean;
}

export interface ContractTemplate {
  id: string;
  name: string;
  description?: string;
  type: string;
  isDefault: boolean;
  isActive: boolean;
  clauseCount?: number;
  clauses?: TemplateClause[];
  createdAt: string;
  updatedAt: string;
}

