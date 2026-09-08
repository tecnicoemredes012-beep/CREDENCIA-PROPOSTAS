import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/Button';
import { LoadingState } from '../../components/ui/Loading';
import { Modal } from '../../components/ui/Modal';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { api } from '../../services/api';
import { FinancialPayable, PayableInstallment } from '../../types';
import { ReceiptPaymentModal } from '../../components/financial/ReceiptPaymentModal';
import { ReversalModal } from '../../components/financial/ReversalModal';
import {
  ArrowDownRight,
  Plus,
  Search,
  Filter,
  Calendar,
  Layers,
  Copy,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Clock,
  Edit2,
  ChevronDown,
  ChevronUp,
  Tag
} from 'lucide-react';

interface PayablesListPageProps {
  initialFilter?: any;
  onAddToast: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;
}

export function PayablesListPage({
  initialFilter,
  onAddToast
}: PayablesListPageProps) {
  const [payables, setPayables] = useState<FinancialPayable[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(initialFilter?.status || 'all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Expanded row
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // Modal: Nova / Editar Despesa
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [formDescription, setFormDescription] = useState('');
  const [formSupplier, setFormSupplier] = useState('');
  const [formSupplierDoc, setFormSupplierDoc] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formEvent, setFormEvent] = useState('');
  const [formAmount, setFormAmount] = useState<number>(0);
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formDueDate, setFormDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [formPaymentType, setFormPaymentType] = useState<'a_vista' | 'parcelado' | 'recorrente'>('a_vista');
  const [formInstallmentsCount, setFormInstallmentsCount] = useState<number>(2);
  const [formMethod, setFormMethod] = useState('Pix');
  const [formAccountId, setFormAccountId] = useState('acc-default-itau');
  const [formNotes, setFormNotes] = useState('');

  // Payment Modal
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [activeInstallment, setActiveInstallment] = useState<PayableInstallment | null>(null);
  const [activePayable, setActivePayable] = useState<FinancialPayable | null>(null);

  // Reversal Modal
  const [reversalModalOpen, setReversalModalOpen] = useState(false);
  const [activePaymentForReversal, setActivePaymentForReversal] = useState<any | null>(null);
  const [reversalLoading, setReversalLoading] = useState(false);

  const fetchPayables = async () => {
    try {
      setLoading(true);
      const [pays, cats, accs] = await Promise.all([
        api.financial.getPayables(),
        api.financial.getCategories({ type: 'expense' }),
        api.financial.getAccounts()
      ]);
      setPayables(pays);
      setCategories(cats);
      setAccounts(accs);
      if (cats.length > 0 && !formCategory) setFormCategory(cats[0].id);
      if (accs.length > 0) setFormAccountId(accs[0].id);
    } catch (err: any) {
      onAddToast('error', 'Erro ao carregar contas a pagar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayables();
  }, []);

  const today = new Date().toISOString().split('T')[0];

  const filteredPayables = payables.filter(p => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const codeMatch = p.code?.toLowerCase().includes(q);
      const descMatch = p.description?.toLowerCase().includes(q);
      const suppMatch = p.supplierName?.toLowerCase().includes(q);
      const eventMatch = p.eventName?.toLowerCase().includes(q);
      if (!codeMatch && !descMatch && !suppMatch && !eventMatch) return false;
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'overdue') {
        const hasOverdue = p.installments?.some(i => i.status === 'overdue' || (i.status === 'pending' && i.dueDate < today));
        if (!hasOverdue) return false;
      } else if (statusFilter === 'pending') {
        if (p.status !== 'pending' && p.status !== 'partially_paid') return false;
      } else if (statusFilter === 'paid') {
        if (p.status !== 'paid') return false;
      }
    }

    if (categoryFilter !== 'all') {
      if (p.categoryId !== categoryFilter) return false;
    }

    return true;
  });

  const handleCreatePayable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formAmount <= 0) {
      onAddToast('error', 'O valor da despesa deve ser maior que zero.');
      return;
    }
    if (!formDescription.trim()) {
      onAddToast('error', 'Informe a descrição da despesa.');
      return;
    }
    if (!formSupplier.trim()) {
      onAddToast('error', 'Informe o fornecedor ou profissional.');
      return;
    }

    try {
      await api.financial.createPayable({
        description: formDescription.trim(),
        supplierName: formSupplier.trim(),
        supplierDocument: formSupplierDoc.trim(),
        categoryId: formCategory,
        eventName: formEvent.trim(),
        expenseDate: formDate,
        dueDate: formDueDate,
        amount: formAmount,
        paymentType: formPaymentType,
        installmentsCount: formPaymentType === 'a_vista' ? 1 : formInstallmentsCount,
        paymentMethod: formMethod,
        sourceAccountId: formAccountId,
        notes: formNotes.trim(),
        performedBy: 'Administrador'
      });
      onAddToast('success', 'Despesa cadastrada com sucesso.');
      setFormModalOpen(false);
      resetForm();
      fetchPayables();
    } catch (err: any) {
      onAddToast('error', 'Erro ao cadastrar despesa: ' + err.message);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await api.financial.duplicatePayable(id);
      onAddToast('success', 'Despesa duplicada com sucesso.');
      fetchPayables();
    } catch (err: any) {
      onAddToast('error', 'Erro ao duplicar: ' + err.message);
    }
  };

  const handleOpenPayment = (inst: PayableInstallment, pay: FinancialPayable) => {
    setActiveInstallment(inst);
    setActivePayable(pay);
    setPaymentModalOpen(true);
  };

  const handleOpenReversal = (paymentItem: any, pay: FinancialPayable) => {
    setActivePaymentForReversal({
      id: paymentItem.id,
      description: `Pagamento ${pay.description}`,
      amount: paymentItem.amount,
      date: paymentItem.paymentDate,
      payableId: pay.id
    });
    setReversalModalOpen(true);
  };

  const handleConfirmReversal = async (reason: string) => {
    if (!activePaymentForReversal) return;
    try {
      setReversalLoading(true);
      await api.financial.reversePayment(activePaymentForReversal.payableId, activePaymentForReversal.id, {
        reason,
        performedBy: 'Administrador'
      });
      onAddToast('success', 'Pagamento estornado com sucesso.');
      setReversalModalOpen(false);
      fetchPayables();
    } catch (err: any) {
      onAddToast('error', 'Erro ao estornar pagamento: ' + err.message);
    } finally {
      setReversalLoading(false);
    }
  };

  const resetForm = () => {
    setFormDescription('');
    setFormSupplier('');
    setFormSupplierDoc('');
    setFormEvent('');
    setFormAmount(0);
    setFormPaymentType('a_vista');
    setFormInstallmentsCount(2);
    setFormNotes('');
  };

  if (loading) {
    return <LoadingState label="Carregando contas a pagar..." />;
  }

  return (
    <div className="space-y-6">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ArrowDownRight size={20} className="text-amber-700" />
            Contas a Pagar (Despesas Operacionais)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Controle de técnicos, fornecedores, transportes, hospedagem e despesas de eventos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setFormModalOpen(true)}
            leftIcon={<Plus size={14} />}
          >
            Nova Despesa
          </Button>
        </div>
      </div>

      {/* 2. Filter Controls */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por descrição, fornecedor, evento..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-emerald-500 bg-white"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium bg-white focus:outline-none focus:border-emerald-500"
            >
              <option value="all">Todos os Status</option>
              <option value="pending">A Pagar / Pendentes</option>
              <option value="overdue">Vencidos (Atrasados)</option>
              <option value="paid">Pagos / Liquidados</option>
            </select>
          </div>

          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium bg-white focus:outline-none focus:border-emerald-500"
            >
              <option value="all">Todas as Categorias</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 3. Payables Table */}
      <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-xs">
        {filteredPayables.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <Layers size={32} className="mx-auto text-slate-300" />
            <p className="text-xs font-semibold text-slate-600">Nenhuma despesa operacional cadastrada.</p>
            <p className="text-[11px] text-slate-400">Clique em "Nova Despesa" para registrar pagamentos de técnicos ou fornecedores.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-3 w-10"></th>
                  <th className="py-3 px-3">Código</th>
                  <th className="py-3 px-3">Descrição / Categoria</th>
                  <th className="py-3 px-3">Fornecedor</th>
                  <th className="py-3 px-3">Evento Vinculado</th>
                  <th className="py-3 px-3 text-right">Valor Total</th>
                  <th className="py-3 px-3 text-right">Pago</th>
                  <th className="py-3 px-3 text-right">Saldo</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredPayables.map((p) => {
                  const isExpanded = expandedRowId === p.id;
                  const isPaid = p.status === 'paid';
                  const isOverdue = p.status === 'overdue';

                  return (
                    <React.Fragment key={p.id}>
                      <tr
                        onClick={() => setExpandedRowId(isExpanded ? null : p.id)}
                        className={`hover:bg-slate-50/80 transition cursor-pointer ${
                          isExpanded ? 'bg-slate-50/90' : ''
                        }`}
                      >
                        <td className="py-3 px-3 text-center text-slate-400">
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </td>
                        <td className="py-3 px-3 font-mono font-extrabold text-slate-900">
                          {p.code}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-bold text-slate-900 block">
                            {p.description}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-semibold">
                            <Tag size={10} />
                            {p.categoryName}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-800">
                          {p.supplierName}
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          {p.eventName || 'Geral (Sem evento)'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-900">
                          {formatCurrency(p.amount)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-emerald-700 font-bold">
                          {formatCurrency(p.paidAmount)}
                        </td>
                        <td className={`py-3 px-3 text-right font-mono font-extrabold ${
                          p.balance > 0 ? (isOverdue ? 'text-rose-600' : 'text-slate-900') : 'text-slate-400'
                        }`}>
                          {formatCurrency(p.balance)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.status === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                            isOverdue ? 'bg-rose-100 text-rose-800' :
                            p.status === 'partially_paid' ? 'bg-amber-100 text-amber-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {p.status === 'paid' ? 'Pago' : isOverdue ? 'Vencido' : (p.status === 'partially_paid' ? 'Parcial' : 'Pendente')}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleDuplicate(p.id)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
                              title="Duplicar Despesa"
                            >
                              <Copy size={14} />
                            </button>
                            <button
                              onClick={() => setExpandedRowId(isExpanded ? null : p.id)}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                            >
                              {isExpanded ? 'Ocultar' : `Parcelas (${p.installments?.length || 1})`}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Sub-table */}
                      {isExpanded && (
                        <tr className="bg-slate-50/60">
                          <td colSpan={10} className="p-4 pl-12 border-b border-slate-200">
                            <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                                  <Calendar size={14} className="text-amber-700" />
                                  Parcelas da Despesa {p.code}
                                </span>
                                <span className="text-[11px] text-slate-500">
                                  Tipo: <strong>{p.paymentType === 'a_vista' ? 'À vista' : (p.paymentType === 'parcelado' ? 'Parcelada' : 'Recorrente')}</strong>
                                </span>
                              </div>

                              <table className="w-full text-xs text-left">
                                <thead className="bg-slate-100/80 text-slate-600 font-bold border-b border-slate-200">
                                  <tr>
                                    <th className="py-2 px-2.5">Parcela</th>
                                    <th className="py-2 px-2.5">Vencimento</th>
                                    <th className="py-2 px-2.5 text-right">Valor</th>
                                    <th className="py-2 px-2.5 text-right">Pago</th>
                                    <th className="py-2 px-2.5 text-right">Saldo</th>
                                    <th className="py-2 px-2.5 text-center">Status</th>
                                    <th className="py-2 px-2.5 text-right">Ação</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium">
                                  {p.installments?.map((inst) => (
                                    <tr key={inst.id} className="hover:bg-slate-50/80">
                                      <td className="py-2 px-2.5 font-mono font-bold text-slate-800">
                                        {inst.identifier}
                                      </td>
                                      <td className="py-2 px-2.5 text-slate-600">
                                        {formatDate(inst.dueDate)}
                                      </td>
                                      <td className="py-2 px-2.5 text-right font-mono text-slate-900">
                                        {formatCurrency(inst.originalAmount)}
                                      </td>
                                      <td className="py-2 px-2.5 text-right font-mono text-emerald-700 font-bold">
                                        {formatCurrency(inst.paidAmount)}
                                      </td>
                                      <td className="py-2 px-2.5 text-right font-mono font-extrabold text-slate-900">
                                        {formatCurrency(inst.balance)}
                                      </td>
                                      <td className="py-2 px-2.5 text-center">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                          inst.status === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                                          inst.status === 'overdue' ? 'bg-rose-100 text-rose-800' :
                                          inst.status === 'partially_paid' ? 'bg-amber-100 text-amber-800' :
                                          'bg-blue-100 text-blue-800'
                                        }`}>
                                          {inst.status === 'paid' ? 'Pago' : (inst.status === 'overdue' ? 'Vencido' : 'Pendente')}
                                        </span>
                                      </td>
                                      <td className="py-2 px-2.5 text-right">
                                        {inst.status !== 'paid' && inst.status !== 'cancelled' && (
                                          <Button
                                            variant="primary"
                                            size="sm"
                                            onClick={() => handleOpenPayment(inst, p)}
                                            leftIcon={<DollarSign size={13} />}
                                          >
                                            Pagar
                                          </Button>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
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

      {/* 4. Modal: Nova Despesa */}
      {formModalOpen && (
        <Modal
          isOpen={formModalOpen}
          onClose={() => setFormModalOpen(false)}
          title="Cadastrar Despesa Operacional"
          maxWidth="2xl"
        >
          <form onSubmit={handleCreatePayable} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                  Descrição da Despesa *
                </label>
                <input
                  type="text"
                  required
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Ex: Diárias de Credenciamento Presencial"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                  Fornecedor / Profissional *
                </label>
                <input
                  type="text"
                  required
                  value={formSupplier}
                  onChange={(e) => setFormSupplier(e.target.value)}
                  placeholder="Ex: João Técnico / Vasp Locações"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                  Categoria *
                </label>
                <select
                  required
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-medium"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                  Evento Vinculado
                </label>
                <input
                  type="text"
                  value={formEvent}
                  onChange={(e) => setFormEvent(e.target.value)}
                  placeholder="Ex: REGISTER GIGA 2026"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                  Valor Total (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={formAmount || ''}
                  onChange={(e) => setFormAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-base font-mono font-bold bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                  Tipo de Condição
                </label>
                <select
                  value={formPaymentType}
                  onChange={(e) => setFormPaymentType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                >
                  <option value="a_vista">À vista</option>
                  <option value="parcelado">Parcelada</option>
                  <option value="recorrente">Recorrente por período</option>
                </select>
              </div>

              {formPaymentType !== 'a_vista' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                    Quantidade de Parcelas
                  </label>
                  <input
                    type="number"
                    min="2"
                    max="36"
                    value={formInstallmentsCount}
                    onChange={(e) => setFormInstallmentsCount(parseInt(e.target.value, 10) || 2)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold bg-white"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                  Data de Vencimento *
                </label>
                <input
                  type="date"
                  required
                  value={formDueDate}
                  onChange={(e) => setFormDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                  Forma de Pagamento
                </label>
                <select
                  value={formMethod}
                  onChange={(e) => setFormMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
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
                  Conta de Saída
                </label>
                <select
                  value={formAccountId}
                  onChange={(e) => setFormAccountId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                Observações
              </label>
              <textarea
                rows={2}
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Detalhes ou notas fiscais vinculadas..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="secondary" size="sm" onClick={() => setFormModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" size="sm" leftIcon={<CheckCircle2 size={15} />}>
                Salvar Despesa
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* 5. Modal: Registrar Pagamento */}
      {paymentModalOpen && activeInstallment && activePayable && (
        <ReceiptPaymentModal
          isOpen={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          mode="payment"
          installment={activeInstallment}
          parentEntity={activePayable}
          onSuccess={fetchPayables}
          onAddToast={onAddToast}
        />
      )}

      {/* 6. Modal: Estorno de Pagamento */}
      {reversalModalOpen && activePaymentForReversal && (
        <ReversalModal
          isOpen={reversalModalOpen}
          onClose={() => setReversalModalOpen(false)}
          targetRecord={activePaymentForReversal}
          onConfirm={handleConfirmReversal}
          loading={reversalLoading}
        />
      )}
    </div>
  );
}
