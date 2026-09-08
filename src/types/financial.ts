import { Client } from './index';

export type FinancialStatus = 'pending' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';

export type PaymentConditionType = 'a_vista' | 'parcelado' | 'entrada_parcelas';

export type PaymentMethod =
  | 'Pix'
  | 'Boleto bancário'
  | 'Transferência bancária'
  | 'Cartão de crédito'
  | 'Cartão de débito'
  | 'Dinheiro'
  | 'Outro';

export interface FinancialAccount {
  id: string;
  name: string;
  type: 'checking' | 'cash' | 'savings' | 'pix' | 'other';
  bankName?: string;
  agency?: string;
  accountNumber?: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialCategory {
  id: string;
  name: string;
  type: 'expense' | 'revenue';
  color?: string;
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReceivableInstallment {
  id: string;
  receivableId: string;
  installmentNumber: number;
  totalInstallments: number;
  identifier: string; // ex: CTR-2026-0001-P01/03 ou Entrada
  isEntry: boolean;
  dueDate: string;
  originalAmount: number;
  receivedAmount: number;
  balance: number;
  status: FinancialStatus;
  paymentMethod: string;
  destinationAccountId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  receipts?: FinancialReceipt[];
}

export interface FinancialReceipt {
  id: string;
  receivableId: string;
  installmentId: string;
  receiptNumber: string;
  receivedDate: string;
  amount: number;
  paymentMethod: string;
  destinationAccountId?: string;
  accountName?: string;
  transactionRef?: string;
  proofDocumentPath?: string;
  proofDocumentName?: string;
  notes?: string;
  isReversed: boolean;
  reversedAt?: string;
  reversedBy?: string;
  reversalReason?: string;
  receivedBy: string;
  createdAt: string;
}

export interface FinancialReceivable {
  id: string;
  code: string;
  sequenceNumber: number;
  year: number;
  contractId?: string;
  proposalId?: string;
  proposalNumber?: string;
  contractNumber?: string;
  clientId: string;
  clientSnapshot: Client | any;
  eventName: string;
  eventStartDate?: string;
  eventEndDate?: string;
  proposalAmount: number;
  contractAmount: number;
  discountAmount: number;
  finalAmount: number;
  paymentMethod: string;
  paymentTerms?: string;
  paymentConditionType: PaymentConditionType;
  installmentsCount: number;
  entryAmount: number;
  entryDate?: string;
  firstDueDate: string;
  intervalDays: number;
  destinationAccountId?: string;
  status: FinancialStatus;
  totalReceived: number;
  balance: number;
  notes?: string;
  organizationId: string;
  createdBy: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  installments?: ReceivableInstallment[];
}

export interface PayableInstallment {
  id: string;
  payableId: string;
  installmentNumber: number;
  totalInstallments: number;
  identifier: string;
  dueDate: string;
  originalAmount: number;
  paidAmount: number;
  balance: number;
  status: FinancialStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  payments?: FinancialPayment[];
}

export interface FinancialPayment {
  id: string;
  payableId: string;
  installmentId: string;
  paymentDate: string;
  amount: number;
  paymentMethod: string;
  sourceAccountId?: string;
  accountName?: string;
  transactionRef?: string;
  proofDocumentPath?: string;
  proofDocumentName?: string;
  notes?: string;
  isReversed: boolean;
  reversedAt?: string;
  reversedBy?: string;
  reversalReason?: string;
  paidBy: string;
  createdAt: string;
}

export interface FinancialPayable {
  id: string;
  code: string;
  sequenceNumber: number;
  year: number;
  description: string;
  supplierName: string;
  supplierDocument?: string;
  categoryId: string;
  categoryName: string;
  categoryColor?: string;
  eventName?: string;
  proposalId?: string;
  contractId?: string;
  expenseDate: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  balance: number;
  paymentType: 'a_vista' | 'parcelado' | 'recorrente';
  installmentsCount: number;
  intervalDays: number;
  paymentMethod: string;
  sourceAccountId?: string;
  status: FinancialStatus;
  notes?: string;
  attachmentPath?: string;
  attachmentName?: string;
  organizationId: string;
  createdBy: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  installments?: PayableInstallment[];
}

export interface FinancialReceiptDocument {
  id: string;
  receiptNumber: string; // REC-AAAA-XXXX
  sequenceNumber: number;
  year: number;
  receivableId?: string;
  receiptId?: string;
  clientName: string;
  clientDocument: string;
  amount: number;
  amountInWords: string;
  receiptDate: string;
  paymentMethod: string;
  referenceDescription: string;
  installmentDescription?: string;
  eventName?: string;
  contractNumber?: string;
  proposalNumber?: string;
  issuerName: string;
  issuerDocument: string;
  notes?: string;
  createdAt: string;
}

export interface FinancialHistory {
  id: string;
  entityType: 'receivable' | 'payable' | 'receipt' | 'payment' | 'category' | 'contract';
  entityId: string;
  action: string;
  previousValue?: string;
  newValue?: string;
  reason?: string;
  notes?: string;
  performedBy: string;
  createdAt: string;
}

export interface FinancialSettings {
  id: string;
  defaultReceivingAccountId?: string;
  defaultPaymentAccountId?: string;
  defaultPaymentMethod: string;
  defaultDueDays: number;
  allowFinancialWithoutContract: boolean;
  allowPaymentAboveValue: boolean;
  requireProofAttachment: boolean;
  requireReversalReason: boolean;
  receiptPrefix: string;
  receiptHeaderText?: string;
  bankAccountDetails?: string;
  updatedAt: string;
}

export interface EventFinancialResult {
  eventName: string;
  clientName: string;
  clientDocument?: string;
  proposalNumber?: string;
  contractNumber?: string;
  contractId?: string;
  proposalId?: string;
  contractAmount: number;
  revenueExpected: number;
  revenueReceived: number;
  revenuePending: number;
  revenueOverdue: number;
  expenseExpected: number;
  expensePaid: number;
  expensePending: number;
  resultExpected: number;
  resultRealized: number;
  marginExpectedPercent: number;
  marginRealizedPercent: number;
  financialStatus: 'lucro' | 'prejuizo' | 'neutro';
  receivables: FinancialReceivable[];
  payables: FinancialPayable[];
}

export interface CashFlowEntry {
  id: string;
  date: string;
  type: 'entrada' | 'saida';
  partyName: string; // Cliente ou Fornecedor
  eventName?: string;
  description: string;
  categoryName?: string;
  amountExpected: number;
  amountRealized: number;
  status: FinancialStatus;
  paymentMethod: string;
  accumulatedBalance?: number;
  referenceCode?: string;
  isRealized: boolean;
}

export interface FinancialOverviewMetrics {
  totalReceivableExpected: number;
  totalReceivableReceived: number;
  totalReceivableOverdue: number;
  totalReceivablePending: number;
  totalPayableExpected: number;
  totalPayablePaid: number;
  totalPayableOverdue: number;
  totalPayablePending: number;
  operationalBalanceRealized: number; // Recebido - Pago
  operationalBalanceExpected: number; // Previsto Receber - Previsto Pagar
  todayReceiptsCount: number;
  todayReceiptsAmount: number;
  todayPaymentsCount: number;
  todayPaymentsAmount: number;
  next7DaysDueAmount: number;
  next30DaysDueAmount: number;
  negativeEventsCount: number;
  recentMovements: Array<{
    id: string;
    date: string;
    type: 'entrada' | 'saida';
    description: string;
    amount: number;
    partyName: string;
    eventName?: string;
    status: string;
  }>;
}
