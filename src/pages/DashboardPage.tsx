import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { DashboardMetrics, Proposal, SystemSettings } from '../types';
import { Card, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { LoadingState } from '../components/ui/Loading';
import { Modal } from '../components/ui/Modal';
import { ProposalStatusBadge } from '../components/proposals/ProposalStatusBadge';
import { formatCurrency, formatDate } from '../utils/formatters';
import { generateProposalPDF } from '../services/proposalPdfService';
import {
  FileText,
  FileCheck2,
  Send,
  Clock,
  AlertTriangle,
  DollarSign,
  Plus,
  Eye,
  Download,
  ArrowRight,
  TrendingUp,
  Trash2
} from 'lucide-react';

interface DashboardPageProps {
  onNavigateToNew: () => void;
  onNavigateToList: () => void;
  onViewProposal: (id: string) => void;
  onEditProposal: (id: string) => void;
  onAddToast: (type: 'success' | 'error' | 'info', message: string) => void;
  settings?: SystemSettings | null;
}

export function DashboardPage({
  onNavigateToNew,
  onNavigateToList,
  onViewProposal,
  onEditProposal,
  onAddToast,
  settings
}: DashboardPageProps) {
  const [data, setData] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [proposalToDelete, setProposalToDelete] = useState<Proposal | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const res = await api.dashboard.getMetrics();
      setData(res);
    } catch (err: any) {
      onAddToast('error', 'Erro ao carregar dados do painel: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDeleteModal = async () => {
    if (!proposalToDelete) return;
    try {
      setIsDeleting(true);
      await api.proposals.delete(proposalToDelete.id);
      onAddToast('success', `Proposta ${proposalToDelete.number} excluída com sucesso.`);
      setProposalToDelete(null);
      fetchMetrics();
    } catch (err: any) {
      onAddToast('error', 'Erro ao excluir proposta: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

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
      fetchMetrics();
    }, 1500);
  };

  if (loading || !data) {
    return <LoadingState label="Carregando métricas e propostas recentes..." />;
  }

  const metricCards = [
    {
      title: 'Total de Propostas',
      value: data.totalProposals,
      icon: <FileText size={20} className="text-slate-700" />,
      bgIcon: 'bg-slate-100'
    },
    {
      title: 'Em Rascunho',
      value: data.draftProposals,
      icon: <Clock size={20} className="text-slate-600" />,
      bgIcon: 'bg-slate-100'
    },
    {
      title: 'Propostas Enviadas',
      value: data.sentProposals,
      icon: <Send size={20} className="text-purple-600" />,
      bgIcon: 'bg-purple-50'
    },
    {
      title: 'Propostas Aprovadas',
      value: data.approvedProposals,
      icon: <FileCheck2 size={20} className="text-emerald-600" />,
      bgIcon: 'bg-emerald-50'
    },
    {
      title: 'Propostas Vencidas',
      value: data.expiredProposals,
      icon: <AlertTriangle size={20} className="text-orange-600" />,
      bgIcon: 'bg-orange-50'
    },
    {
      title: 'Faturamento Aprovado',
      value: formatCurrency(data.totalApprovedAmount),
      icon: <TrendingUp size={20} className="text-[#12e000]" />,
      bgIcon: 'bg-emerald-950 text-white',
      isRevenue: true
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Welcome & Quick Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 text-white shadow-xl">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#12e000]">
            Visão Geral de Orçamentos
          </span>
          <h2 className="font-display text-2xl font-extrabold tracking-tight mt-1">
            Painel de Propostas Comerciais
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Gerencie orçamentos com numeração automática anual, tabelas calculadas em tempo real e emissão instantânea em A4 e PDF.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus size={16} />}
            onClick={onNavigateToNew}
          >
            Nova Proposta
          </Button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {metricCards.map((card, idx) => (
          <Card key={idx} className="relative overflow-hidden border border-slate-200/80">
            <CardBody className="p-4 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 line-clamp-1">
                  {card.title}
                </span>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${card.bgIcon}`}>
                  {card.icon}
                </div>
              </div>
              <div className={`font-mono font-extrabold leading-tight ${card.isRevenue ? 'text-lg text-emerald-800' : 'text-2xl text-slate-900'}`}>
                {card.value}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Recent Proposals Card & Table */}
      <div className="cx-card border border-slate-200/80 overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-6 py-4 border-b border-slate-200/60">
          <div>
            <h3 className="font-display text-base font-bold text-slate-900">
              Propostas Recentes
            </h3>
            <p className="text-xs text-slate-500">
              Últimas propostas emitidas no ecossistema Credencia
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            rightIcon={<ArrowRight size={15} />}
            onClick={onNavigateToList}
          >
            Ver todas as propostas
          </Button>
        </div>

        {data.recentProposals.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            Nenhuma proposta cadastrada ainda. Clique em "Nova Proposta" para iniciar.
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
                  <th className="py-3 px-4 w-28 text-right">Valor Final</th>
                  <th className="py-3 px-4 w-32 text-center">Status</th>
                  <th className="py-3 px-4 w-36 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.recentProposals.map((p) => {
                  const client: any = p.clientSnapshot || {};
                  return (
                    <tr
                      key={p.id}
                      onClick={() => onViewProposal(p.id)}
                      className="hover:bg-slate-50/60 transition cursor-pointer"
                    >
                      {/* Number */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {p.number}
                      </td>

                      {/* Client */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800 line-clamp-1">
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
                        <div className="font-semibold text-slate-700 line-clamp-1">
                          {p.eventName}
                        </div>
                        {p.eventLocation && (
                          <div className="text-[10px] text-slate-400 line-clamp-1">
                            {p.eventLocation}
                          </div>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {formatDate(p.issueDate)}
                      </td>

                      {/* Value */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 text-right whitespace-nowrap">
                        {formatCurrency(p.finalAmount)}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <ProposalStatusBadge status={p.status} />
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onViewProposal(p.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                            title="Visualizar Proposta em A4"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            onClick={e => handleDownloadPdf(e, p)}
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
                            title="Baixar em PDF"
                          >
                            <Download size={15} />
                          </button>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setProposalToDelete(p);
                            }}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Excluir Proposta"
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

      {/* Modal: Confirmação de Exclusão de Proposta */}
      <Modal
        isOpen={!!proposalToDelete}
        onClose={() => !isDeleting && setProposalToDelete(null)}
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
                Ela será removida do painel de controle e da listagem de propostas ativas.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setProposalToDelete(null)}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              leftIcon={<Trash2 size={14} />}
              onClick={handleConfirmDeleteModal}
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
