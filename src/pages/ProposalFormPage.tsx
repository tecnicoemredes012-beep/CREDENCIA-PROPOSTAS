import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Client, Proposal, ProposalItem, ServiceItem, SystemSettings } from '../types';
import { ProposalItemEditor } from '../components/proposals/ProposalItemEditor';
import { ClientFormModal } from '../components/clients/ClientFormModal';
import { Button } from '../components/ui/Button';
import { Field, inputClassName, selectClassName, textareaClassName } from '../components/ui/Form';
import { LoadingState } from '../components/ui/Loading';
import { Modal } from '../components/ui/Modal';
import { formatCurrency, calculateDueDate, formatDate } from '../utils/formatters';
import { calculateProposalTotals } from '../utils/calculations';
import {
  Save,
  ArrowLeft,
  UserPlus,
  Calendar,
  DollarSign,
  FileText,
  MapPin,
  Sparkles,
  Eye,
  Download,
  Edit,
  Trash2,
  AlertTriangle
} from 'lucide-react';

interface ProposalFormPageProps {
  proposalId?: string | null;
  onSaveSuccess: (savedProposal: Proposal) => void;
  onCancel: () => void;
  onViewProposal?: (id: string) => void;
  onAddToast: (type: 'success' | 'error' | 'info', message: string) => void;
  settings?: SystemSettings | null;
}

export function ProposalFormPage({
  proposalId,
  onSaveSuccess,
  onCancel,
  onViewProposal,
  onAddToast,
  settings
}: ProposalFormPageProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Catalogs
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingClientModal, setEditingClientModal] = useState<Client | null>(null);

  // Section 1: Identification
  const [numberPreview, setNumberPreview] = useState('PROP-2026-XXXX');
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [validityDays, setValidityDays] = useState(15);
  const [dueDate, setDueDate] = useState(() => calculateDueDate(new Date().toISOString().split('T')[0], 15));
  const [responsibleName, setResponsibleName] = useState('Comercial Credencia');
  const [status, setStatus] = useState<'draft' | 'generated' | 'sent' | 'negotiating' | 'approved'>('draft');
  const [internalNotes, setInternalNotes] = useState('');

  // Section 2: Client
  const [selectedClientId, setSelectedClientId] = useState('');
  const selectedClient = clients.find(c => c.id === selectedClientId) || null;

  // Section 3: Event
  const [eventName, setEventName] = useState('');
  const [eventStartDate, setEventStartDate] = useState('');
  const [eventEndDate, setEventEndDate] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventCity, setEventCity] = useState('');
  const [eventState, setEventState] = useState('');
  const [estimatedAttendees, setEstimatedAttendees] = useState<number | string>('');
  const [eventNotes, setEventNotes] = useState('');

  // Section 4: Services Items
  const [items, setItems] = useState<ProposalItem[]>([]);

  // Section 5: Financial Summary
  const [discountMode, setDiscountMode] = useState<'percent' | 'fixed'>('percent');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [additionalAmount, setAdditionalAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('Boleto bancário');
  const [paymentTerms, setPaymentTerms] = useState(settings?.defaultPaymentTerms || 'Faturamento em 30 dias');
  const [financialNotes, setFinancialNotes] = useState('');
  const [termsAndConditions, setTermsAndConditions] = useState(settings?.generalConditions || '');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Calculate live totals
  const totals = calculateProposalTotals(
    items,
    discountMode,
    discountPercent,
    discountAmount,
    additionalAmount
  );

  // Recalculate dueDate whenever issueDate or validityDays changes
  useEffect(() => {
    setDueDate(calculateDueDate(issueDate, Number(validityDays) || 15));
  }, [issueDate, validityDays]);

  // Load initial data
  useEffect(() => {
    const initData = async () => {
      try {
        setLoading(true);
        const [clientsData, servicesData] = await Promise.all([
          api.clients.list(),
          api.services.list()
        ]);
        setClients(clientsData);
        setServices(servicesData);

        if (proposalId) {
          // Editing existing proposal
          const prop = await api.proposals.get(proposalId);
          setNumberPreview(prop.number);
          setIssueDate(prop.issueDate);
          setValidityDays(prop.validityDays);
          setDueDate(prop.dueDate);
          setResponsibleName(prop.responsibleName);
          setStatus(prop.status as any);
          setInternalNotes(prop.internalNotes || '');

          setSelectedClientId(prop.clientId);

          setEventName(prop.eventName);
          setEventStartDate(prop.eventStartDate || '');
          setEventEndDate(prop.eventEndDate || '');
          setEventLocation(prop.eventLocation || '');
          setEventCity(prop.eventCity || '');
          setEventState(prop.eventState || '');
          setEstimatedAttendees(prop.estimatedAttendees || '');
          setEventNotes(prop.eventNotes || '');

          setItems(prop.items || []);

          if (prop.discountPercent > 0) {
            setDiscountMode('percent');
            setDiscountPercent(prop.discountPercent);
            setDiscountAmount(prop.discountAmount);
          } else if (prop.discountAmount > 0) {
            setDiscountMode('fixed');
            setDiscountAmount(prop.discountAmount);
            setDiscountPercent(prop.discountPercent);
          }

          setAdditionalAmount(prop.additionalAmount || 0);
          setPaymentMethod(prop.paymentMethod || 'Boleto bancário');
          setPaymentTerms(prop.paymentTerms || 'Faturamento em 30 dias');
          setFinancialNotes(prop.financialNotes || '');
          setTermsAndConditions(prop.termsAndConditions || settings?.generalConditions || '');
        } else {
          // Creating new proposal: fetch preview of next number
          const next = await api.proposals.getNextNumber();
          setNumberPreview(next.number);

          // Pre-populate with the first client if available
          if (clientsData.length > 0) {
            setSelectedClientId(clientsData[0].id);
          }

          if (settings?.generalConditions) {
            setTermsAndConditions(settings.generalConditions);
          }
          if (settings?.defaultPaymentTerms) {
            setPaymentTerms(settings.defaultPaymentTerms);
          }
        }
      } catch (err: any) {
        onAddToast('error', 'Erro ao carregar dados do formulário: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, [proposalId]);

  // Handle Quick Client Save / Update without leaving page
  const handleQuickClientSave = async (clientData: Partial<Client>) => {
    try {
      if (editingClientModal) {
        const updated = await api.clients.update(editingClientModal.id, clientData);
        setClients(prev => prev.map(c => c.id === updated.id ? updated : c));
        setSelectedClientId(updated.id);
        onAddToast('success', `Dados do cliente "${updated.name}" atualizados com sucesso!`);
      } else {
        const created = await api.clients.create(clientData);
        setClients(prev => [...prev, created]);
        setSelectedClientId(created.id);
        onAddToast('success', `Cliente "${created.name}" cadastrado e selecionado!`);
      }
      setIsClientModalOpen(false);
      setEditingClientModal(null);
    } catch (err: any) {
      onAddToast('error', 'Erro ao salvar cliente: ' + err.message);
    }
  };

  const handleSaveProposal = async (targetStatus?: 'draft' | 'generated') => {
    if (!selectedClientId) {
      onAddToast('error', 'Por favor, selecione um cliente para a proposta.');
      return;
    }
    if (!eventName.trim()) {
      onAddToast('error', 'Por favor, informe o nome do evento.');
      return;
    }
    if (items.length === 0) {
      onAddToast('error', 'Adicione pelo menos um serviço na proposta.');
      return;
    }

    try {
      setSaving(true);

      const finalStatus = targetStatus || status;

      const payload = {
        clientId: selectedClientId,
        clientSnapshot: selectedClient || undefined,
        issueDate,
        validityDays: Number(validityDays),
        dueDate,
        responsibleName: responsibleName.trim() || 'Comercial Credencia',
        status: finalStatus,
        eventName: eventName.trim(),
        eventStartDate: eventStartDate || undefined,
        eventEndDate: eventEndDate || undefined,
        eventLocation: eventLocation.trim() || undefined,
        eventCity: eventCity.trim() || undefined,
        eventState: eventState.trim() || undefined,
        estimatedAttendees: estimatedAttendees ? Number(estimatedAttendees) : undefined,
        eventNotes: eventNotes.trim() || undefined,
        items,
        subtotal: totals.subtotal,
        discountPercent: totals.discountPercent,
        discountAmount: totals.discountAmount,
        additionalAmount: totals.additionalAmount,
        finalAmount: totals.finalAmount,
        paymentMethod,
        paymentTerms,
        financialNotes: financialNotes.trim() || undefined,
        internalNotes: internalNotes.trim() || undefined,
        termsAndConditions: termsAndConditions.trim() || undefined
      };

      let result: Proposal;
      if (proposalId) {
        result = await api.proposals.update(proposalId, payload);
        onAddToast('success', `Proposta ${result.number} atualizada com sucesso!`);
      } else {
        result = await api.proposals.create(payload);
        onAddToast('success', `Proposta ${result.number} criada e salva com sucesso!`);
      }

      onSaveSuccess(result);
    } catch (err: any) {
      onAddToast('error', err.message || 'Erro ao salvar proposta');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProposalConfirm = async () => {
    if (!proposalId) return;
    try {
      setIsDeleting(true);
      await api.proposals.delete(proposalId);
      onAddToast('success', 'Proposta excluída com sucesso.');
      setDeleteModalOpen(false);
      onCancel();
    } catch (err: any) {
      onAddToast('error', 'Erro ao excluir proposta: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return <LoadingState label="Carregando dados da proposta..." />;
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={onCancel} leftIcon={<ArrowLeft size={16} />}>
            Voltar
          </Button>
          <div>
            <h2 className="font-display text-xl font-extrabold text-slate-900 tracking-tight">
              {proposalId ? `Editar Proposta ${numberPreview}` : 'Nova Proposta Comercial'}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Preencha os dados do cliente, do evento e monte o escopo de serviços
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={() => handleSaveProposal('draft')}
            disabled={saving}
          >
            Salvar Rascunho
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            leftIcon={<Save size={16} />}
            onClick={() => handleSaveProposal('generated')}
            disabled={saving}
          >
            {saving ? 'Salvando...' : 'Salvar Proposta'}
          </Button>
        </div>
      </div>

      {/* 1. SEÇÃO IDENTIFICAÇÃO */}
      <div className="cx-card p-6 border border-slate-200/80 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-800 font-bold text-xs flex items-center justify-center">
              1
            </span>
            <h3 className="font-display text-sm font-extrabold text-slate-900 uppercase tracking-wider">
              Identificação da Proposta
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Número Oficial:</span>
            <span className="font-mono text-sm font-extrabold text-[#0a8900] bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              {numberPreview}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Field label="Data de Emissão" required>
            <input
              type="date"
              value={issueDate}
              onChange={e => setIssueDate(e.target.value)}
              className={inputClassName}
              required
            />
          </Field>

          <Field label="Validade (Dias)" required>
            <input
              type="number"
              min="1"
              max="90"
              value={validityDays}
              onChange={e => setValidityDays(parseInt(e.target.value) || 15)}
              className={inputClassName}
              required
            />
          </Field>

          <Field label="Data de Vencimento (Calculada)">
            <input
              type="text"
              readOnly
              value={formatDate(dueDate)}
              className={`${inputClassName} bg-slate-100 text-slate-600 font-semibold cursor-not-allowed`}
            />
          </Field>

          <Field label="Responsável Comercial" required>
            <input
              type="text"
              value={responsibleName}
              onChange={e => setResponsibleName(e.target.value)}
              placeholder="Nome do consultor"
              className={inputClassName}
              required
            />
          </Field>
        </div>

        <Field label="Observações Internas (Não aparecem na proposta impressa)">
          <input
            type="text"
            value={internalNotes}
            onChange={e => setInternalNotes(e.target.value)}
            placeholder="Notas sobre negociação, canal de captação, etc..."
            className={inputClassName}
          />
        </Field>
      </div>

      {/* 2. SEÇÃO CLIENTE */}
      <div className="cx-card p-6 border border-slate-200/80 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-800 font-bold text-xs flex items-center justify-center">
              2
            </span>
            <h3 className="font-display text-sm font-extrabold text-slate-900 uppercase tracking-wider">
              Cliente Contratante
            </h3>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setIsClientModalOpen(true)}
            leftIcon={<UserPlus size={14} />}
          >
            Cadastrar Novo Cliente
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
          <div className="sm:col-span-12">
            <Field label="Selecionar Cliente da Base" required>
              <select
                value={selectedClientId}
                onChange={e => setSelectedClientId(e.target.value)}
                className={selectClassName}
                required
              >
                <option value="">Selecione um cliente...</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.tradeName ? `(${c.tradeName})` : ''} • Doc: {c.document}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {selectedClient && (
            <div className="sm:col-span-12 p-4 rounded-2xl border border-emerald-200/70 bg-emerald-50/40 text-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-slate-400 font-bold block uppercase text-[10px]">Razão Social:</span>
                <span className="font-extrabold text-slate-900 text-sm">{selectedClient.name}</span>
                {selectedClient.tradeName && (
                  <span className="text-slate-500 block text-[11px]">Fantasia: {selectedClient.tradeName}</span>
                )}
              </div>
              <div>
                <span className="text-slate-400 font-bold block uppercase text-[10px]">Documento / Contato:</span>
                <span className="font-mono text-slate-800 font-bold">{selectedClient.document}</span>
                <span className="text-slate-600 block mt-0.5">
                  {selectedClient.contactPerson} {selectedClient.role ? `(${selectedClient.role})` : ''}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block uppercase text-[10px]">E-mail e Telefone:</span>
                <span className="text-slate-800 font-semibold block">{selectedClient.email}</span>
                <span className="text-slate-600 block">{selectedClient.phone || '-'}</span>
                <div className="pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setEditingClientModal(selectedClient);
                      setIsClientModalOpen(true);
                    }}
                    leftIcon={<Edit size={13} />}
                  >
                    Editar Dados Deste Cliente
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. SEÇÃO EVENTO */}
      <div className="cx-card p-6 border border-slate-200/80 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <span className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-800 font-bold text-xs flex items-center justify-center">
            3
          </span>
          <h3 className="font-display text-sm font-extrabold text-slate-900 uppercase tracking-wider">
            Dados do Evento
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
          <div className="sm:col-span-6">
            <Field label="Nome do Evento" required>
              <input
                type="text"
                value={eventName}
                onChange={e => setEventName(e.target.value)}
                placeholder="Ex: REGISTER GIGA 2026"
                className={inputClassName}
                required
              />
            </Field>
          </div>

          <div className="sm:col-span-3">
            <Field label="Data Inicial">
              <input
                type="date"
                value={eventStartDate}
                onChange={e => setEventStartDate(e.target.value)}
                className={inputClassName}
              />
            </Field>
          </div>

          <div className="sm:col-span-3">
            <Field label="Data Final">
              <input
                type="date"
                value={eventEndDate}
                onChange={e => setEventEndDate(e.target.value)}
                className={inputClassName}
              />
            </Field>
          </div>

          <div className="sm:col-span-5">
            <Field label="Local de Realização">
              <input
                type="text"
                value={eventLocation}
                onChange={e => setEventLocation(e.target.value)}
                placeholder="Ex: Centro de Convenções Pro Magno"
                className={inputClassName}
              />
            </Field>
          </div>

          <div className="sm:col-span-3">
            <Field label="Cidade">
              <input
                type="text"
                value={eventCity}
                onChange={e => setEventCity(e.target.value)}
                placeholder="São Paulo"
                className={inputClassName}
              />
            </Field>
          </div>

          <div className="sm:col-span-1">
            <Field label="UF">
              <input
                type="text"
                maxLength={2}
                value={eventState}
                onChange={e => setEventState(e.target.value.toUpperCase())}
                placeholder="SP"
                className={inputClassName}
              />
            </Field>
          </div>

          <div className="sm:col-span-3">
            <Field label="Público Estimado (Participantes)">
              <input
                type="number"
                min="0"
                value={estimatedAttendees}
                onChange={e => setEstimatedAttendees(e.target.value)}
                placeholder="Ex: 500"
                className={inputClassName}
              />
            </Field>
          </div>

          <div className="sm:col-span-12">
            <Field label="Observações Especiais sobre o Evento">
              <input
                type="text"
                value={eventNotes}
                onChange={e => setEventNotes(e.target.value)}
                placeholder="Ex: Evento corporativo de 2 dias com 4 totens de autoatendimento e crachás térmicos..."
                className={inputClassName}
              />
            </Field>
          </div>
        </div>
      </div>

      {/* 4. SEÇÃO SERVIÇOS */}
      <div className="cx-card p-6 border border-slate-200/80 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-800 font-bold text-xs flex items-center justify-center">
              4
            </span>
            <h3 className="font-display text-sm font-extrabold text-slate-900 uppercase tracking-wider">
              Serviços e Escopo da Proposta
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {items.length} {items.length === 1 ? 'item adicionado' : 'itens adicionados'}
          </span>
        </div>

        <ProposalItemEditor
          items={items}
          onChange={setItems}
          availableServices={services}
        />
      </div>

      {/* 5. SEÇÃO RESUMO FINANCEIRO */}
      <div className="cx-card p-6 border border-slate-200/80 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <span className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-800 font-bold text-xs flex items-center justify-center">
            5
          </span>
          <h3 className="font-display text-sm font-extrabold text-slate-900 uppercase tracking-wider">
            Resumo Financeiro e Condições
          </h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Conditions & notes */}
          <div className="lg:col-span-7 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Forma de Pagamento">
                <input
                  type="text"
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                  placeholder="Boleto bancário, PIX..."
                  className={inputClassName}
                />
              </Field>

              <Field label="Prazo / Condição">
                <input
                  type="text"
                  value={paymentTerms}
                  onChange={e => setPaymentTerms(e.target.value)}
                  placeholder="Faturamento em 30 dias"
                  className={inputClassName}
                />
              </Field>
            </div>

            <Field label="Observações Financeiras">
              <textarea
                rows={2}
                value={financialNotes}
                onChange={e => setFinancialNotes(e.target.value)}
                placeholder="Ex: Faturamento emitido após conclusão do evento com vencimento para 30 dias corridos..."
                className={textareaClassName}
              />
            </Field>

            <Field label="Condições Gerais e Cláusulas">
              <textarea
                rows={3}
                value={termsAndConditions}
                onChange={e => setTermsAndConditions(e.target.value)}
                placeholder="Termos gerais aplicados a esta proposta comercial..."
                className={textareaClassName}
              />
            </Field>
          </div>

          {/* Right Column: Live Calculated Totals Card */}
          <div className="lg:col-span-5 p-5 rounded-2xl border border-slate-200 bg-white/90 shadow-sm space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-100">
              Cálculo Automático
            </h4>

            {/* Subtotal */}
            <div className="flex justify-between items-center text-sm font-semibold text-slate-700">
              <span>Subtotal dos Itens:</span>
              <span className="font-mono text-base font-bold text-slate-900">{formatCurrency(totals.subtotal)}</span>
            </div>

            {/* Discount selector mode */}
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1.5">
                <span>Desconto Comercial:</span>
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[10px]">
                  <button
                    type="button"
                    onClick={() => setDiscountMode('percent')}
                    className={`px-2 py-0.5 rounded cursor-pointer ${discountMode === 'percent' ? 'bg-white font-bold text-slate-900 shadow-xs' : 'text-slate-500'}`}
                  >
                    % Porcento
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountMode('fixed')}
                    className={`px-2 py-0.5 rounded cursor-pointer ${discountMode === 'fixed' ? 'bg-white font-bold text-slate-900 shadow-xs' : 'text-slate-500'}`}
                  >
                    R$ Valor
                  </button>
                </div>
              </div>

              {discountMode === 'percent' ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={discountPercent}
                    onChange={e => setDiscountPercent(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-24 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold outline-none focus:border-emerald-500"
                  />
                  <span className="text-xs font-bold text-slate-500">% =</span>
                  <span className="font-mono text-xs font-bold text-rose-600">
                    - {formatCurrency(totals.discountAmount)}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discountAmount}
                    onChange={e => setDiscountAmount(parseFloat(e.target.value) || 0)}
                    placeholder="0,00"
                    className="w-32 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold outline-none focus:border-emerald-500"
                  />
                  <span className="text-xs font-bold text-slate-500">
                    ({totals.discountPercent}% do total)
                  </span>
                </div>
              )}
            </div>

            {/* Additional Amount */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-500 mb-1">
                Acréscimos / Taxas Extras (R$)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={additionalAmount}
                onChange={e => setAdditionalAmount(parseFloat(e.target.value) || 0)}
                placeholder="0,00"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold outline-none focus:border-emerald-500"
              />
            </div>

            {/* Final Total Box */}
            <div className="pt-3 border-t border-slate-200">
              <div className="p-3 rounded-2xl bg-[#12e000] text-slate-950 flex items-center justify-between shadow-md">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider block leading-none">
                    Valor Final da Proposta
                  </span>
                  <span className="text-xs opacity-80">
                    Com todos os descontos aplicados
                  </span>
                </div>
                <span className="font-mono text-xl font-extrabold">
                  {formatCurrency(totals.finalAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Save Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <div>
          {proposalId && (
            <Button
              type="button"
              variant="danger"
              size="md"
              leftIcon={<Trash2 size={16} />}
              onClick={() => setDeleteModalOpen(true)}
              disabled={saving || isDeleting}
              className="!bg-rose-600 hover:!bg-rose-700 !text-white"
            >
              Excluir Proposta
            </Button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="md" onClick={onCancel} disabled={saving || isDeleting}>
            Cancelar
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={() => handleSaveProposal('draft')}
            disabled={saving || isDeleting}
          >
            Salvar como Rascunho
          </Button>
          <Button
            variant="primary"
            size="md"
            leftIcon={<Save size={16} />}
            onClick={() => handleSaveProposal('generated')}
            disabled={saving || isDeleting}
          >
            {saving ? 'Salvando Proposta...' : 'Salvar Proposta Oficial'}
          </Button>
        </div>
      </div>

      {/* Quick Client Create / Edit Modal */}
      <ClientFormModal
        isOpen={isClientModalOpen}
        onClose={() => {
          setIsClientModalOpen(false);
          setEditingClientModal(null);
        }}
        onSave={handleQuickClientSave}
        client={editingClientModal}
      />

      {/* Modal: Confirmação de Exclusão de Proposta */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => !isDeleting && setDeleteModalOpen(false)}
        title="Excluir Proposta Comercial"
        subtitle={numberPreview ? `Proposta ${numberPreview} • ${eventName || 'Em edição'}` : ''}
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2.5">
            <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="font-bold block text-sm">Atenção: Exclusão de Proposta</strong>
              <p>
                Deseja realmente excluir a proposta <strong>{numberPreview}</strong>?
                Ela será removida da listagem de propostas ativas e do painel de controle.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setDeleteModalOpen(false)}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              leftIcon={<Trash2 size={14} />}
              onClick={handleDeleteProposalConfirm}
              disabled={isDeleting}
              className="!bg-rose-600 hover:!bg-rose-700 !text-white"
            >
              {isDeleting ? 'Excluindo...' : 'Sim, Excluir Proposta'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
