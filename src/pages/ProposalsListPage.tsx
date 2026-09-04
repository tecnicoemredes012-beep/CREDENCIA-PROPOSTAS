import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Proposal, ProposalStatus, SystemSettings } from '../types';
import { ProposalStatusBadge } from '../components/proposals/ProposalStatusBadge';
import { formatCurrency, formatDate } from '../utils/formatters';
import { generateProposalPDF } from '../services/proposalPdfService';
import { Button } from '../components/ui/Button';
import { LoadingState } from '../components/ui/Loading';
import { Modal } from '../components/ui/Modal';
import {
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  Copy,
  Download,
  Printer,
  Ban,
  Trash2,
  RefreshCw,
  SlidersHorizontal,
  CheckCircle2,
  Calendar,
  FileSignature,
  AlertTriangle,
  X
} from 'lucide-react';

interface ProposalsListPageProps {
  onNavigateToNew: () => void;
  onViewProposal: (id: string) => void;
  onEditProposal: (id: string) => void;
  onViewContract?: (id: string) => void;
  onAddToast: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;
  settings?: SystemSettings | null;
}

export function ProposalsListPage({
  onNavigateToNew,
  onViewProposal,
  onEditProposal,
  onViewContract,
  onAddToast,
  settings
}: ProposalsListPageProps) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [responsible, setResponsible] = useState('');

  // Status Change Modal
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [newStatus, setNewStatus] = useState<ProposalStatus>('draft');
  const [statusReason, setStatusReason] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [proposalToDelete, setProposalToDelete] = useState<Proposal | null>(null);
  const [isDeletingProposal, setIsDeletingProposal] = useState(false);

  const fetchProposals = async () => {
    try {
      setLoading(true);
      const res = await api.proposals.list({
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        responsible: responsible.trim() || undefined
      });
      setProposals(res);
    } catch (err: any) {
      onAddToast('error', 'Erro ao carregar propostas: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProposals();
  }, [statusFilter, startDate, endDate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProposals();
  };

  const handleDuplicate = async (e: React.MouseEvent, proposalId: string) => {
    e.stopPropagation();
    if (!confirm('Deseja duplicar esta proposta? Um novo número sequencial oficial será gerado.')) return;

    try {
      onAddToast('info', 'Duplicando proposta...');
      const duplicated = await api.proposals.duplicate(proposalId);
      onAddToast('success', `Proposta duplicada com sucesso! Novo número: ${duplicated.number}`);
      fetchProposals();
      onEditProposal(duplicated.id);
    } catch (err: any) {
      onAddToast('error', 'Erro ao duplicar: ' + err.message);
    }
  };

  const handleDownloadPdf = (e: React.MouseEvent, proposal: Proposal) => {
    e.stopPropagation();
    onAddToast('info', 'Baixando PDF oficial da proposta...');
    const a = document.createElement('a');
    a.href = `/api/proposals/${proposal.id}/pdf`;
    a.download = `Proposta_${proposal.number}.pdf`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      fetchProposals();
    }, 1500);
  };

  const handlePrint = (e: React.MouseEvent, proposalId: string) => {
    e.stopPropagation();
    onViewProposal(proposalId);
    setTimeout(() => {
      window.print();
    }, 400);
  };

  const handleOpenStatusModal = (e: React.MouseEvent, proposal: Proposal) => {
    e.stopPropagation();
    setSelectedProposal(proposal);
    setNewStatus(proposal.status);
    setStatusReason('');
    setStatusModalOpen(true);
  };

  const handleSaveStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProposal) return;

    try {
      setIsUpdatingStatus(true);
      await api.proposals.updateStatus(
        selectedProposal.id,
        newStatus,
        'Administrador',
        statusReason.trim() || undefined
      );
      onAddToast('success', `Status da proposta atualizado para "${newStatus}".`);
      setStatusModalOpen(false);
      fetchProposals();
    } catch (err: any) {
      onAddToast('error', 'Erro ao alterar status: ' + err.message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleCancelProposal = async (e: React.MouseEvent, proposalId: string) => {
    e.stopPropagation();
    const reason = prompt('Informe o motivo do cancelamento da proposta:');
    if (reason === null) return; // User pressed cancel

    try {
      await api.proposals.updateStatus(proposalId, 'cancelled', 'Administrador', reason || 'Cancelada pelo usuário');
      onAddToast('success', 'Proposta marcada como cancelada.');
      fetchProposals();
    } catch (err: any) {
      onAddToast('error', 'Erro ao cancelar: ' + err.message);
    }
  };

  const handleConfirmDeleteModal = async () => {
    if (!proposalToDelete) return;
    try {
      setIsDeletingProposal(true);
      await api.proposals.delete(proposalToDelete.id);
      onAddToast('success', `Proposta ${proposalToDelete.number} excluída com sucesso.`);
      setProposalToDelete(null);
      fetchProposals();
    } catch (err: any) {
      onAddToast('error', 'Erro ao excluir proposta: ' + err.message);
    } finally {
      setIsDeletingProposal(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, proposalId: string, propNumber: string) => {
    e.stopPropagation();
    const target = proposals.find(p => p.id === proposalId);
    if (target) {
      setProposalToDelete(target);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setStartDate('');
    setEndDate('');
    setResponsible('');
    setTimeout(() => {
      api.proposals.list().then(setProposals);
    }, 50);
  };

  return (
    <div className="space-y-5">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-extrabold text-slate-900 tracking-tight">
            Gerenciamento de Propostas
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Consulte, filtre, imprima e faça o controle de status de todas as propostas
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          leftIcon={<Plus size={16} />}
          onClick={onNavigateToNew}
        >
          Nova Proposta
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur-md shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search input */}
          <div className="sm:col-span-4 relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Pesquisar por número, cliente ou evento..."
              className="w-full pl-10 pr-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white outline-none focus:border-emerald-500"
            />
          </div>

          {/* Status filter */}
          <div className="sm:col-span-2">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="">Todos os status</option>
              <option value="draft">Rascunho</option>
              <option value="generated">Gerada</option>
              <option value="sent">Enviada</option>
              <option value="negotiating">Em negociação</option>
              <option value="approved">Aprovada</option>
              <option value="rejected">Recusada</option>
              <option value="cancelled">Cancelada</option>
              <option value="expired">Vencida</option>
            </select>
          </div>

          {/* Date start */}
          <div className="sm:col-span-2">
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white outline-none focus:border-emerald-500"
              title="Data de emissão inicial"
            />
          </div>

          {/* Date end */}
          <div className="sm:col-span-2">
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white outline-none focus:border-emerald-500"
              title="Data de emissão final"
            />
          </div>

          {/* Filter actions */}
          <div className="sm:col-span-2 flex items-center gap-2">
            <Button type="submit" variant="secondary" size="sm" className="flex-1">
              Buscar
            </Button>
            {(search || statusFilter || startDate || endDate || responsible) && (
              <button
                type="button"
                onClick={clearFilters}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                title="Limpar filtros"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Proposals Data Table */}
      <div className="cx-card border border-slate-200/80 overflow-hidden">
        {loading ? (
          <LoadingState label="Atualizando lista de propostas..." />
        ) : proposals.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <p className="text-sm font-semibold">Nenhuma proposta encontrada com os filtros selecionados.</p>
            <Button variant="secondary" size="sm" onClick={clearFilters} className="mt-3">
              Limpar Filtros
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200/70 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4 w-32">Número</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Evento</th>
                  <th className="py-3 px-4 w-24">Emissão</th>
                  <th className="py-3 px-4 w-24">Validade</th>
                  <th className="py-3 px-4 w-28 text-right">Valor Final</th>
                  <th className="py-3 px-4 w-32 text-center">Status</th>
                  <th className="py-3 px-4 w-28">Responsável</th>
                  <th className="py-3 px-4 min-w-[260px] text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {proposals.map((p) => {
                  const client: any = p.clientSnapshot || {};
                  return (
                    <tr
                      key={p.id}
                      onClick={() => onViewProposal(p.id)}
                      className="hover:bg-slate-50/70 transition cursor-pointer group"
                    >
                      {/* Number */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {p.number}
                      </td>

                      {/* Client */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 line-clamp-1">
                          {client.name || 'Cliente'}
                        </div>
                        {client.tradeName && (
                          <div className="text-[10px] text-slate-400 line-clamp-1">
                            {client.tradeName}
                          </div>
                        )}
                      </td>

                      {/* Event */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800 line-clamp-1">
                          {p.eventName}
                        </div>
                        {p.eventLocation && (
                          <div className="text-[10px] text-slate-400 line-clamp-1">
                            {p.eventLocation}
                          </div>
                        )}
                      </td>

                      {/* Issue Date */}
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {formatDate(p.issueDate)}
                      </td>

                      {/* Due Date */}
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {formatDate(p.dueDate)}
                      </td>

                      {/* Final Value */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 text-right whitespace-nowrap">
                        {formatCurrency(p.finalAmount)}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <ProposalStatusBadge status={p.status} />
                      </td>

                      {/* Responsible */}
                      <td className="py-3 px-4 text-slate-600 line-clamp-1 max-w-[120px]">
                        {p.responsibleName}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap min-w-[260px]" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onViewProposal(p.id)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-950 hover:bg-slate-100 transition cursor-pointer"
                            title="Visualizar em Formato A4"
                          >
                            <Eye size={15} />
                          </button>

                          <button
                            onClick={() => onEditProposal(p.id)}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                            title="Editar Proposta"
                          >
                            <Edit size={15} />
                          </button>

                          <button
                            onClick={e => handleDuplicate(e, p.id)}
                            className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                            title="Duplicar Proposta (novo número automático)"
                          >
                            <Copy size={15} />
                          </button>

                          <button
                            onClick={e => handleDownloadPdf(e, p)}
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
                            title="Baixar em PDF"
                          >
                            <Download size={15} />
                          </button>

                          <button
                            onClick={e => handlePrint(e, p.id)}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                            title="Imprimir Proposta"
                          >
                            <Printer size={15} />
                          </button>

                          {/* Contract shortcut for approved proposals */}
                          {p.status === 'approved' && (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  onAddToast('info', 'Verificando contrato vinculado...');
                                  const list = await api.contracts.list({ proposalNumber: p.number });
                                  if (list && list.length > 0) {
                                    onViewContract?.(list[0].id);
                                  } else {
                                    if (confirm(`Gerar minuta oficial do contrato para a proposta aprovada ${p.number}?`)) {
                                      const created = await api.contracts.createFromProposal(p.id);
                                      onAddToast('success', `Contrato ${created.number} gerado!`);
                                      onViewContract?.(created.id);
                                    }
                                  }
                                } catch (err: any) {
                                  onAddToast('error', 'Erro ao processar contrato: ' + err.message);
                                }
                              }}
                              className="p-1.5 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition cursor-pointer"
                              title="Gerar ou Ver Contrato Vinculado"
                            >
                              <FileSignature size={15} />
                            </button>
                          )}

                          <button
                            onClick={e => handleOpenStatusModal(e, p)}
                            className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition cursor-pointer"
                            title="Alterar Status"
                          >
                            <SlidersHorizontal size={15} />
                          </button>

                          {p.status !== 'cancelled' && (
                            <button
                              onClick={e => handleCancelProposal(e, p.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                              title="Cancelar Proposta"
                            >
                              <Ban size={15} />
                            </button>
                          )}

                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setProposalToDelete(p);
                            }}
                            className="p-1.5 rounded-lg text-rose-600 bg-rose-50/70 hover:bg-rose-100 hover:text-rose-700 border border-rose-200/60 transition cursor-pointer"
                            title="Excluir Proposta"
                            aria-label="Excluir Proposta"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Status Change Modal */}
      <Modal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title="Alterar Status da Proposta"
        subtitle={selectedProposal ? `Proposta ${selectedProposal.number} • ${selectedProposal.eventName}` : ''}
        maxWidth="md"
      >
        <form onSubmit={handleSaveStatus} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Novo Status
            </label>
            <select
              value={newStatus}
              onChange={e => setNewStatus(e.target.value as ProposalStatus)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="draft">Rascunho</option>
              <option value="generated">Gerada</option>
              <option value="sent">Enviada</option>
              <option value="negotiating">Em negociação</option>
              <option value="approved">Aprovada</option>
              <option value="rejected">Recusada</option>
              <option value="cancelled">Cancelada</option>
              <option value="expired">Vencida</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Observação / Motivo (Opcional)
            </label>
            <input
              type="text"
              value={statusReason}
              onChange={e => setStatusReason(e.target.value)}
              placeholder="Ex: Cliente aprovou o escopo via WhatsApp..."
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setStatusModalOpen(false)}
              disabled={isUpdatingStatus}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isUpdatingStatus}
            >
              {isUpdatingStatus ? 'Salvando...' : 'Confirmar Alteração'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Confirmação de Exclusão de Proposta */}
      <Modal
        isOpen={!!proposalToDelete}
        onClose={() => !isDeletingProposal && setProposalToDelete(null)}
        title="Excluir Proposta Comercial"
        subtitle={proposalToDelete ? `Proposta ${proposalToDelete.number} • ${proposalToDelete.eventName}` : ''}
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2.5">
            <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="font-bold block text-sm">Confirmar Exclusão</strong>
              <p>
                Deseja realmente excluir a proposta <strong>{proposalToDelete?.number}</strong>?
                Ela será removida da listagem de propostas ativas e do painel de controle.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setProposalToDelete(null)}
              disabled={isDeletingProposal}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              leftIcon={<Trash2 size={14} />}
              onClick={handleConfirmDeleteModal}
              disabled={isDeletingProposal}
              className="!bg-rose-600 hover:!bg-rose-700 !text-white"
            >
              {isDeletingProposal ? 'Excluindo...' : 'Sim, Excluir Proposta'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
