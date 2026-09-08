import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { LoadingState } from '../../components/ui/Loading';
import { Modal } from '../../components/ui/Modal';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { api } from '../../services/api';
import { FinancialReceivable, ReceivableInstallment, FinancialStatus } from '../../types';
import { ReceiptPaymentModal } from '../../components/financial/ReceiptPaymentModal';
import { ReversalModal } from '../../components/financial/ReversalModal';
import { ReceiptViewModal } from '../../components/financial/ReceiptViewModal';
import {
  DollarSign,
  Search,
  Filter,
  ArrowUpRight,
  RotateCcw,
  Calendar,
  FileText,
  FileSignature,
  Printer,
  Edit2,
  XCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Plus
} from 'lucide-react';

interface ReceivablesListPageProps {
  initialFilter?: any;
  onViewProposal: (id: string) => void;
  onViewContract: (id: string) => void;
  onAddToast: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;
}

export function ReceivablesListPage({
  initialFilter,
  onViewProposal,
  onViewContract,
  onAddToast
}: ReceivablesListPageProps) {
  const [receivables, setReceivables] = useState<FinancialReceivable[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(initialFilter?.status || 'all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState(initialFilter?.period || 'all');

  // Expanded rows
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // Modals state
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [activeInstallment, setActiveInstallment] = useState<ReceivableInstallment | null>(null);
  const [activeReceivable, setActiveReceivable] = useState<FinancialReceivable | null>(null);

  const [reversalModalOpen, setReversalModalOpen] = useState(false);
  const [activeReceiptForReversal, setActiveReceiptForReversal] = useState<any | null>(null);
  const [reversalLoading, setReversalLoading] = useState(false);

  const [receiptViewModalOpen, setReceiptViewModalOpen] = useState(false);
  const [currentOfficialReceipt, setCurrentOfficialReceipt] = useState<any | null>(null);

  // Edit installment dueDate modal
  const [editDueDateModalOpen, setEditDueDateModalOpen] = useState(false);
  const [editDueDateValue, setEditDueDateValue] = useState('');
  const [editNotesValue, setEditNotesValue] = useState('');
  const [editingInstId, setEditingInstId] = useState<string | null>(null);

  // Manual Receivable Modal
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualClient, setManualClient] = useState('');
  const [manualEvent, setManualEvent] = useState('');
  const [manualDesc, setManualDesc] = useState('');
  const [manualAmount, setManualAmount] = useState<number>(0);
  const [manualDueDate, setManualDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualMethod, setManualMethod] = useState('Pix');

  const fetchReceivables = async () => {
    try {
      setLoading(true);
      const data = await api.financial.getReceivables();
      setReceivables(data);
    } catch (err: any) {
      onAddToast('error', 'Erro ao listar contas a receber: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceivables();
  }, []);

  // Filter application
  const today = new Date().toISOString().split('T')[0];
  const next7Days = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

  const filteredReceivables = receivables.filter(r => {
    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      const codeMatch = r.code?.toLowerCase().includes(q);
      const propMatch = r.proposalNumber?.toLowerCase().includes(q);
      const ctrMatch = r.contractNumber?.toLowerCase().includes(q);
      const eventMatch = r.eventName?.toLowerCase().includes(q);
      const clientName = (r.clientSnapshot?.name || r.clientSnapshot?.tradeName || '').toLowerCase();
      const clientMatch = clientName.includes(q);
      if (!codeMatch && !propMatch && !ctrMatch && !eventMatch && !clientMatch) return false;
    }

    // Status
    if (statusFilter !== 'all') {
      if (statusFilter === 'overdue') {
        const hasOverdue = r.installments?.some(i => i.status === 'overdue' || (i.status === 'pending' && i.dueDate < today));
        if (!hasOverdue) return false;
      } else if (statusFilter === 'pending') {
        if (r.status !== 'pending' && r.status !== 'partially_paid') return false;
      } else if (statusFilter === 'paid') {
        if (r.status !== 'paid') return false;
      } else if (statusFilter === 'cancelled') {
        if (r.status !== 'cancelled') return false;
      }
    }

    // Payment Method
    if (paymentMethodFilter !== 'all') {
      if (r.paymentMethod !== paymentMethodFilter) return false;
    }

    // Date Filter
    if (dateFilter === '7days') {
      const hasUpcoming = r.installments?.some(i => i.status !== 'paid' && i.status !== 'cancelled' && i.dueDate >= today && i.dueDate <= next7Days);
      if (!hasUpcoming) return false;
    }

    return true;
  });

  // Action Handlers
  const handleOpenReceipt = (inst: ReceivableInstallment, rec: FinancialReceivable) => {
    setActiveInstallment(inst);
    setActiveReceivable(rec);
    setReceiptModalOpen(true);
  };

  const handleOpenReversal = (receiptItem: any, rec: FinancialReceivable) => {
    setActiveReceiptForReversal({
      id: receiptItem.id,
      description: `Liquidação ${receiptItem.receiptNumber}`,
      amount: receiptItem.amount,
      date: receiptItem.receivedDate,
      receivableId: rec.id
    });
    setReversalModalOpen(true);
  };

  const handleConfirmReversal = async (reason: string) => {
    if (!activeReceiptForReversal) return;
    try {
      setReversalLoading(true);
      await api.financial.reverseReceipt(activeReceiptForReversal.receivableId, activeReceiptForReversal.id, {
        reason,
        performedBy: 'Administrador'
      });
      onAddToast('success', 'Recebimento estornado com sucesso!');
      setReversalModalOpen(false);
      fetchReceivables();
    } catch (err: any) {
      onAddToast('error', 'Erro ao estornar: ' + err.message);
    } finally {
      setReversalLoading(false);
    }
  };

  const handleIssueReceipt = async (receiptId: string) => {
    try {
      onAddToast('info', 'Gerando recibo oficial timbrado...');
      const res = await api.financial.issueReceiptDocument(receiptId);
      setCurrentOfficialReceipt(res.document);
      setReceiptViewModalOpen(true);
    } catch (err: any) {
      onAddToast('error', 'Erro ao emitir recibo: ' + err.message);
    }
  };

  const handleOpenEditDueDate = (inst: ReceivableInstallment) => {
    setEditingInstId(inst.id);
    setEditDueDateValue(inst.dueDate);
    setEditNotesValue(inst.notes || '');
    setEditDueDateModalOpen(true);
  };

  const handleSaveDueDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInstId || !editDueDateValue) return;
    try {
      await api.financial.updateReceivableInstallment(editingInstId, {
        dueDate: editDueDateValue,
        notes: editNotesValue,
        performedBy: 'Administrador'
      });
      onAddToast('success', 'Vencimento atualizado com sucesso.');
      setEditDueDateModalOpen(false);
      fetchReceivables();
    } catch (err: any) {
      onAddToast('error', 'Erro ao atualizar vencimento: ' + err.message);
    }
  };

  const handleCancelInstallment = async (inst: ReceivableInstallment) => {
    const reason = prompt(`Confirma o cancelamento da parcela ${inst.identifier}? Digite o motivo:`);
    if (!reason || !reason.trim()) return;

    try {
      await api.financial.cancelReceivableInstallment(inst.id, {
        reason: reason.trim(),
        performedBy: 'Administrador'
      });
      onAddToast('success', 'Parcela cancelada com sucesso.');
      fetchReceivables();
    } catch (err: any) {
      onAddToast('error', 'Erro ao cancelar parcela: ' + err.message);
    }
  };

  const handleCreateManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (manualAmount <= 0) {
      onAddToast('error', 'Informe um valor válido.');
      return;
    }
    try {
      await api.financial.createManualReceivable({
        eventName: manualEvent.trim() || 'Receita Avulsa',
        description: manualDesc.trim() || 'Receita Avulsa',
        amount: manualAmount,
        dueDate: manualDueDate,
        paymentMethod: manualMethod,
        performedBy: 'Administrador'
      });
      onAddToast('success', 'Receita avulsa cadastrada com sucesso.');
      setManualModalOpen(false);
      setManualAmount(0);
      setManualEvent('');
      setManualDesc('');
      fetchReceivables();
    } catch (err: any) {
      onAddToast('error', 'Erro ao cadastrar receita: ' + err.message);
    }
  };

  if (loading) {
    return <LoadingState label="Carregando contas a receber..." />;
  }

  return (
    <div className="space-y-6">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ArrowUpRight size={20} className="text-[#0a8900]" />
            Contas a Receber
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Gestão de parcelas, liquidações e emissão de recibos dos contratos firmados.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setManualModalOpen(true)}
            leftIcon={<Plus size={14} />}
          >
            Nova Receita Avulsa
          </Button>
        </div>
      </div>

      {/* 2. Filters Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search size={15} className="absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por código, cliente, evento..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-emerald-500 bg-white"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium bg-white focus:outline-none focus:border-emerald-500"
            >
              <option value="all">Todos os Status</option>
              <option value="pending">A Vencer / Pendentes</option>
              <option value="overdue">Vencidos (Atenção)</option>
              <option value="paid">Recebidos / Quitados</option>
              <option value="cancelled">Cancelados</option>
            </select>
          </div>

          {/* Forma de Pagamento */}
          <div>
            <select
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium bg-white focus:outline-none focus:border-emerald-500"
            >
              <option value="all">Todas as Formas de Pagamento</option>
              <option value="Boleto bancário">Boleto bancário</option>
              <option value="Pix">Pix</option>
              <option value="Transferência bancária">Transferência bancária</option>
              <option value="Cartão de crédito">Cartão de crédito</option>
              <option value="Dinheiro">Dinheiro</option>
            </select>
          </div>

          {/* Período */}
          <div>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium bg-white focus:outline-none focus:border-emerald-500"
            >
              <option value="all">Todos os Vencimentos</option>
              <option value="7days">Próximos 7 Dias</option>
            </select>
          </div>
        </div>

        {/* Quick status counters */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="text-slate-500 font-medium">Exibindo {filteredReceivables.length} títulos:</span>
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
              statusFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({receivables.length})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
              statusFilter === 'pending' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
            }`}
          >
            Pendentes
          </button>
          <button
            onClick={() => setStatusFilter('overdue')}
            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
              statusFilter === 'overdue' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
            }`}
          >
            Vencidos
          </button>
          <button
            onClick={() => setStatusFilter('paid')}
            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
              statusFilter === 'paid' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            Quitados
          </button>
        </div>
      </div>

      {/* 3. Receivables Table */}
      <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-xs">
        {filteredReceivables.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <DollarSign size={32} className="mx-auto text-slate-300" />
            <p className="text-xs font-semibold text-slate-600">Nenhum lançamento a receber encontrado.</p>
            <p className="text-[11px] text-slate-400">Assine contratos para gerar contas a receber ou crie uma receita avulsa.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-3 w-10"></th>
                  <th className="py-3 px-3">Código</th>
                  <th className="py-3 px-3">Contrato / Proposta</th>
                  <th className="py-3 px-3">Cliente</th>
                  <th className="py-3 px-3">Evento</th>
                  <th className="py-3 px-3 text-right">Valor Contratado</th>
                  <th className="py-3 px-3 text-right">Recebido</th>
                  <th className="py-3 px-3 text-right">Saldo Devedor</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredReceivables.map((rec) => {
                  const isExpanded = expandedRowId === rec.id;
                  const clientName = rec.clientSnapshot?.tradeName || rec.clientSnapshot?.name || 'Cliente';
                  const isPaid = rec.status === 'paid';
                  const isOverdue = rec.status === 'overdue';

                  return (
                    <React.Fragment key={rec.id}>
                      <tr
                        onClick={() => setExpandedRowId(isExpanded ? null : rec.id)}
                        className={`hover:bg-slate-50/80 transition cursor-pointer ${
                          isExpanded ? 'bg-slate-50/90' : ''
                        }`}
                      >
                        <td className="py-3.5 px-3 text-center text-slate-400">
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </td>
                        <td className="py-3.5 px-3 font-mono font-extrabold text-slate-900">
                          {rec.code}
                        </td>
                        <td className="py-3.5 px-3">
                          {rec.contractNumber ? (
                            <span className="font-mono text-emerald-800 font-bold block">
                              {rec.contractNumber}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono text-[11px]">Avulso</span>
                          )}
                          {rec.proposalNumber && (
                            <span className="text-[10px] text-slate-500 font-mono block">
                              {rec.proposalNumber}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-3 font-semibold text-slate-900 max-w-[180px] truncate">
                          {clientName}
                        </td>
                        <td className="py-3.5 px-3 text-slate-700 max-w-[160px] truncate">
                          {rec.eventName}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono text-slate-900">
                          {formatCurrency(rec.finalAmount)}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono text-emerald-700 font-bold">
                          {formatCurrency(rec.totalReceived)}
                        </td>
                        <td className={`py-3.5 px-3 text-right font-mono font-extrabold ${
                          rec.balance > 0 ? (isOverdue ? 'text-rose-600' : 'text-slate-900') : 'text-slate-400'
                        }`}>
                          {formatCurrency(rec.balance)}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            rec.status === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                            rec.status === 'overdue' ? 'bg-rose-100 text-rose-800' :
                            rec.status === 'partially_paid' ? 'bg-amber-100 text-amber-800' :
                            rec.status === 'cancelled' ? 'bg-slate-200 text-slate-600' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {rec.status === 'paid' ? 'Recebido' :
                             rec.status === 'overdue' ? 'Vencido' :
                             rec.status === 'partially_paid' ? 'Parcial' :
                             rec.status === 'cancelled' ? 'Cancelado' :
                             'Pendente'}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {rec.contractId && (
                              <button
                                onClick={() => onViewContract(rec.contractId!)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition"
                                title="Abrir Contrato"
                              >
                                <FileSignature size={15} />
                              </button>
                            )}
                            {rec.proposalId && (
                              <button
                                onClick={() => onViewProposal(rec.proposalId!)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition"
                                title="Abrir Proposta"
                              >
                                <FileText size={15} />
                              </button>
                            )}
                            <button
                              onClick={() => setExpandedRowId(isExpanded ? null : rec.id)}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                            >
                              {isExpanded ? 'Ocultar' : `Parcelas (${rec.installments?.length || 1})`}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Sub-table: Installments of this Receivable */}
                      {isExpanded && (
                        <tr className="bg-slate-50/60">
                          <td colSpan={10} className="p-4 pl-12 border-b border-slate-200">
                            <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                                  <Calendar size={14} className="text-emerald-700" />
                                  Cronograma de Parcelas do Título {rec.code}
                                </span>
                                <span className="text-[11px] text-slate-500">
                                  Condição: <strong>{rec.paymentConditionType === 'a_vista' ? 'À vista' : (rec.paymentConditionType === 'entrada_parcelas' ? 'Entrada + Parcelas' : 'Parcelado')}</strong> • Forma: <strong>{rec.paymentMethod}</strong>
                                </span>
                              </div>

                              <table className="w-full text-xs text-left">
                                <thead className="bg-slate-100/80 text-slate-600 font-bold border-b border-slate-200">
                                  <tr>
                                    <th className="py-2 px-2.5">Parcela</th>
                                    <th className="py-2 px-2.5">Vencimento</th>
                                    <th className="py-2 px-2.5 text-right">Valor Original</th>
                                    <th className="py-2 px-2.5 text-right">Recebido</th>
                                    <th className="py-2 px-2.5 text-right">Saldo</th>
                                    <th className="py-2 px-2.5 text-center">Status</th>
                                    <th className="py-2 px-2.5 text-right">Ações da Parcela</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium">
                                  {rec.installments?.map((inst) => {
                                    const instOverdue = inst.status === 'overdue' || (inst.status === 'pending' && inst.dueDate < today);
                                    return (
                                      <tr key={inst.id} className="hover:bg-slate-50/80">
                                        <td className="py-2 px-2.5 font-mono font-bold text-slate-800">
                                          {inst.identifier}
                                        </td>
                                        <td className="py-2 px-2.5 text-slate-600">
                                          <span className={instOverdue ? 'text-rose-600 font-bold' : ''}>
                                            {formatDate(inst.dueDate)}
                                          </span>
                                        </td>
                                        <td className="py-2 px-2.5 text-right font-mono text-slate-900">
                                          {formatCurrency(inst.originalAmount)}
                                        </td>
                                        <td className="py-2 px-2.5 text-right font-mono text-emerald-700 font-bold">
                                          {formatCurrency(inst.receivedAmount)}
                                        </td>
                                        <td className={`py-2 px-2.5 text-right font-mono font-extrabold ${
                                          inst.balance > 0 ? (instOverdue ? 'text-rose-600' : 'text-slate-900') : 'text-slate-400'
                                        }`}>
                                          {formatCurrency(inst.balance)}
                                        </td>
                                        <td className="py-2 px-2.5 text-center">
                                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                            inst.status === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                                            instOverdue ? 'bg-rose-100 text-rose-800' :
                                            inst.status === 'partially_paid' ? 'bg-amber-100 text-amber-800' :
                                            inst.status === 'cancelled' ? 'bg-slate-200 text-slate-600' :
                                            'bg-blue-100 text-blue-800'
                                          }`}>
                                            {inst.status === 'paid' ? 'Recebido' :
                                             instOverdue ? 'Vencido' :
                                             inst.status === 'partially_paid' ? 'Parcial' :
                                             inst.status === 'cancelled' ? 'Cancelado' :
                                             'Pendente'}
                                          </span>
                                        </td>
                                        <td className="py-2 px-2.5 text-right">
                                          <div className="flex items-center justify-end gap-1.5">
                                            {inst.status !== 'paid' && inst.status !== 'cancelled' && (
                                              <Button
                                                variant="primary"
                                                size="sm"
                                                onClick={() => handleOpenReceipt(inst, rec)}
                                                leftIcon={<DollarSign size={13} />}
                                              >
                                                Receber
                                              </Button>
                                            )}

                                            {inst.status !== 'paid' && inst.status !== 'cancelled' && (
                                              <button
                                                onClick={() => handleOpenEditDueDate(inst)}
                                                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                                                title="Alterar Data de Vencimento"
                                              >
                                                <Edit2 size={13} />
                                              </button>
                                            )}

                                            {inst.status !== 'paid' && inst.status !== 'cancelled' && inst.receivedAmount === 0 && (
                                              <button
                                                onClick={() => handleCancelInstallment(inst)}
                                                className="p-1 rounded-md text-rose-400 hover:text-rose-700 hover:bg-rose-50 transition"
                                                title="Cancelar Parcela"
                                              >
                                                <XCircle size={13} />
                                              </button>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Modal: Registrar Recebimento */}
      {receiptModalOpen && activeInstallment && activeReceivable && (
        <ReceiptPaymentModal
          isOpen={receiptModalOpen}
          onClose={() => setReceiptModalOpen(false)}
          mode="receipt"
          installment={activeInstallment}
          parentEntity={activeReceivable}
          onSuccess={fetchReceivables}
          onAddToast={onAddToast}
        />
      )}

      {/* 5. Modal: Estorno de Recebimento */}
      {reversalModalOpen && activeReceiptForReversal && (
        <ReversalModal
          isOpen={reversalModalOpen}
          onClose={() => setReversalModalOpen(false)}
          targetRecord={activeReceiptForReversal}
          onConfirm={handleConfirmReversal}
          loading={reversalLoading}
        />
      )}

      {/* 6. Modal: Visualizar Recibo Oficial (REC-AAAA-XXXX) */}
      {receiptViewModalOpen && currentOfficialReceipt && (
        <ReceiptViewModal
          isOpen={receiptViewModalOpen}
          onClose={() => setReceiptViewModalOpen(false)}
          receiptDoc={currentOfficialReceipt}
        />
      )}

      {/* 7. Modal: Editar Vencimento da Parcela */}
      {editDueDateModalOpen && (
        <Modal
          isOpen={editDueDateModalOpen}
          onClose={() => setEditDueDateModalOpen(false)}
          title="Editar Vencimento da Parcela"
          maxWidth="sm"
        >
          <form onSubmit={handleSaveDueDate} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                Nova Data de Vencimento *
              </label>
              <input
                type="date"
                required
                value={editDueDateValue}
                onChange={(e) => setEditDueDateValue(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                Observações
              </label>
              <textarea
                rows={2}
                value={editNotesValue}
                onChange={(e) => setEditNotesValue(e.target.value)}
                placeholder="Motivo da alteração de data..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="secondary" size="sm" onClick={() => setEditDueDateModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" size="sm">
                Salvar Vencimento
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* 8. Modal: Cadastrar Receita Avulsa */}
      {manualModalOpen && (
        <Modal
          isOpen={manualModalOpen}
          onClose={() => setManualModalOpen(false)}
          title="Nova Receita Avulsa"
          maxWidth="md"
        >
          <form onSubmit={handleCreateManual} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                Nome do Evento / Identificação *
              </label>
              <input
                type="text"
                required
                value={manualEvent}
                onChange={(e) => setManualEvent(e.target.value)}
                placeholder="Ex: WORKSHOP TECNOLOGIA 2026"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                  Valor (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={manualAmount || ''}
                  onChange={(e) => setManualAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-base font-mono font-bold bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                  Data de Vencimento *
                </label>
                <input
                  type="date"
                  required
                  value={manualDueDate}
                  onChange={(e) => setManualDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                Forma de Pagamento
              </label>
              <select
                value={manualMethod}
                onChange={(e) => setManualMethod(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
              >
                <option value="Pix">Pix</option>
                <option value="Boleto bancário">Boleto bancário</option>
                <option value="Transferência bancária">Transferência bancária</option>
                <option value="Cartão de crédito">Cartão de crédito</option>
                <option value="Dinheiro">Dinheiro</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                Descrição Detalhada (Opcional)
              </label>
              <textarea
                rows={2}
                value={manualDesc}
                onChange={(e) => setManualDesc(e.target.value)}
                placeholder="Detalhes dos serviços ou itens faturados..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="secondary" size="sm" onClick={() => setManualModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" size="sm">
                Cadastrar Receita
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
