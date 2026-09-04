import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Proposal, ProposalStatus, SystemSettings } from '../types';
import { ProposalPreviewA4 } from '../components/proposals/ProposalPreviewA4';
import { ProposalStatusBadge } from '../components/proposals/ProposalStatusBadge';
import { ContractStatusBadge } from '../components/contracts/ContractStatusBadge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { LoadingState } from '../components/ui/Loading';
import { generateProposalPDF } from '../services/proposalPdfService';
import { formatDate, formatDateTime, formatCurrency } from '../utils/formatters';
import {
  ArrowLeft,
  Edit,
  Copy,
  Download,
  Printer,
  Send,
  CheckCircle2,
  XCircle,
  Ban,
  Clock,
  History,
  FileCheck,
  ExternalLink,
  FileSignature,
  AlertTriangle,
  DollarSign,
  Trash2
} from 'lucide-react';

interface ProposalViewPageProps {
  proposalId: string;
  onBack: () => void;
  onEdit: (id: string) => void;
  onViewContract?: (contractId: string) => void;
  onAddToast: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;
  settings?: SystemSettings | null;
}

export function ProposalViewPage({
  proposalId,
  onBack,
  onEdit,
  onViewContract,
  onAddToast,
  settings
}: ProposalViewPageProps) {
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [currentSettings, setCurrentSettings] = useState<SystemSettings | null>(settings || null);
  const [loading, setLoading] = useState(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (settings) {
      setCurrentSettings(settings);
    }
  }, [settings]);

  useEffect(() => {
    api.settings.get().then((res) => {
      if (res) setCurrentSettings(res);
    }).catch(() => {});
  }, []);

  // Contract integration state
  const [relatedContract, setRelatedContract] = useState<any | null>(null);
  const [loadingContract, setLoadingContract] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [generatingContract, setGeneratingContract] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchRelatedContract = async (propNumber: string) => {
    try {
      setLoadingContract(true);
      const list = await api.contracts.list({ proposalNumber: propNumber });
      if (list && list.length > 0) {
        setRelatedContract(list[0]);
      } else {
        setRelatedContract(null);
      }
    } catch (err) {
      console.error('Erro ao buscar contrato vinculado:', err);
    } finally {
      setLoadingContract(false);
    }
  };

  const fetchProposal = async () => {
    try {
      setLoading(true);
      const res = await api.proposals.get(proposalId);
      setProposal(res);
      if (res?.number) {
        fetchRelatedContract(res.number);
      }
    } catch (err: any) {
      onAddToast('error', 'Erro ao carregar proposta: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProposal();
  }, [proposalId]);

  const handleDownloadPdf = async () => {
    if (!proposal) return;
    try {
      setIsGeneratingPdf(true);
      onAddToast('info', 'Gerando PDF formal...');
      const fileName = await generateProposalPDF(proposal, currentSettings);
      await api.proposals.markPdfGenerated(proposal.id);
      onAddToast('success', `PDF gerado com sucesso: ${fileName}`);
      fetchProposal();
    } catch (err: any) {
      onAddToast('error', 'Falha ao gerar PDF: ' + err.message);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDuplicate = async () => {
    if (!proposal) return;
    if (!confirm(`Deseja duplicar a proposta ${proposal.number}? Um novo número oficial sequencial será gerado.`)) return;

    try {
      onAddToast('info', 'Duplicando proposta...');
      const duplicated = await api.proposals.duplicate(proposal.id);
      onAddToast('success', `Nova proposta criada: ${duplicated.number}`);
      onEdit(duplicated.id);
    } catch (err: any) {
      onAddToast('error', 'Erro ao duplicar proposta: ' + err.message);
    }
  };

  const handleStatusTransition = async (newStatus: ProposalStatus, label: string) => {
    if (!proposal) return;
    try {
      await api.proposals.updateStatus(proposal.id, newStatus, 'Administrador');
      onAddToast('success', `Proposta marcada como "${label}".`);
      fetchProposal();
    } catch (err: any) {
      onAddToast('error', 'Erro ao alterar status: ' + err.message);
    }
  };

  // Intercept approval to offer immediate contract creation
  const handleStartApprove = () => {
    if (!proposal) return;
    if (relatedContract) {
      // Contract already exists, just approve
      handleStatusTransition('approved', 'Aprovada');
    } else {
      // Prompt user whether to generate contract now or later
      setApproveModalOpen(true);
    }
  };

  const handleConfirmApproveWithContract = async () => {
    if (!proposal) return;
    try {
      setGeneratingContract(true);
      // 1. Mark proposal approved
      await api.proposals.updateStatus(proposal.id, 'approved', 'Administrador');
      onAddToast('success', 'Proposta marcada como Aprovada!');

      // 2. Generate official contract
      onAddToast('info', 'Gerando minuta contratual oficial...');
      const contractRes = await api.contracts.createFromProposal(proposal.id, 'Administrador');
      onAddToast('success', `Contrato ${contractRes.number} gerado com sucesso!`);
      setApproveModalOpen(false);

      if (onViewContract) {
        onViewContract(contractRes.id);
      } else {
        fetchProposal();
      }
    } catch (err: any) {
      onAddToast('error', 'Erro ao gerar contrato: ' + err.message);
    } finally {
      setGeneratingContract(false);
    }
  };

  const handleDeleteProposalConfirm = async () => {
    if (!proposal) return;
    try {
      setIsDeleting(true);
      await api.proposals.delete(proposal.id);
      onAddToast('success', `Proposta ${proposal.number} excluída com sucesso.`);
      setDeleteModalOpen(false);
      onBack();
    } catch (err: any) {
      onAddToast('error', 'Erro ao excluir proposta: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmApproveOnly = async () => {
    setApproveModalOpen(false);
    await handleStatusTransition('approved', 'Aprovada');
  };

  const handleGenerateContractDirect = async () => {
    if (!proposal) return;
    try {
      setGeneratingContract(true);
      onAddToast('info', 'Gerando contrato oficial...');
      const res = await api.contracts.createFromProposal(proposal.id, 'Administrador');
      onAddToast('success', `Contrato ${res.number} gerado com sucesso!`);
      if (onViewContract) {
        onViewContract(res.id);
      } else {
        fetchProposal();
      }
    } catch (err: any) {
      onAddToast('error', 'Erro ao gerar contrato: ' + err.message);
    } finally {
      setGeneratingContract(false);
    }
  };

  const handleCancelProposal = async () => {
    if (!proposal) return;
    const reason = prompt('Informe o motivo do cancelamento da proposta:');
    if (reason === null) return;

    try {
      await api.proposals.updateStatus(proposal.id, 'cancelled', 'Administrador', reason || 'Cancelada pelo usuário');
      onAddToast('success', 'Proposta cancelada.');
      fetchProposal();
    } catch (err: any) {
      onAddToast('error', 'Erro ao cancelar: ' + err.message);
    }
  };

  if (loading || !proposal) {
    return <LoadingState label="Carregando visualização da proposta..." />;
  }

  const historyList = (proposal as any).history || [];

  return (
    <div className="space-y-6 print:space-y-0 print:w-full print:m-0 print:p-0">
      {/* 1. Administrative Action Toolbar (hidden during print) */}
      <div className="no-print p-4 rounded-2xl border border-slate-200/80 bg-white shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Left navigation & Proposal Badge */}
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={onBack} leftIcon={<ArrowLeft size={16} />}>
            Voltar
          </Button>

          <div className="flex items-center gap-2">
            <span className="font-mono text-base font-extrabold text-slate-900">
              {proposal.number}
            </span>
            <ProposalStatusBadge status={proposal.status} />
          </div>
        </div>

        {/* Action buttons matching Credencia */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onEdit(proposal.id)}
            leftIcon={<Edit size={15} />}
          >
            Editar
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleDuplicate}
            leftIcon={<Copy size={15} />}
          >
            Duplicar
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handlePrint}
            leftIcon={<Printer size={15} />}
          >
            Imprimir
          </Button>

          <a
            href={`/api/proposals/${proposal.id}/pdf?view=inline`}
            target="_blank"
            rel="noopener noreferrer"
            className="cx-button-secondary inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer"
            title="Abrir e visualizar documento PDF oficial em nova aba"
          >
            <ExternalLink size={14} className="text-slate-600" />
            Visualizar PDF
          </a>

          <a
            href={`/api/proposals/${proposal.id}/pdf`}
            download={`Proposta_${proposal.number}.pdf`}
            className="cx-button-primary inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer"
            title="Baixar arquivo formal da proposta em formato PDF (.pdf)"
            onClick={() => {
              onAddToast('info', 'Baixando PDF oficial da proposta...');
              setTimeout(fetchProposal, 1500);
            }}
          >
            <Download size={15} />
            Gerar e Baixar PDF
          </a>

          {/* Quick status actions */}
          {proposal.status !== 'sent' && proposal.status !== 'approved' && proposal.status !== 'cancelled' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleStatusTransition('sent', 'Enviada')}
              leftIcon={<Send size={14} className="text-purple-600" />}
            >
              Marcar Enviada
            </Button>
          )}

          {proposal.status !== 'approved' && proposal.status !== 'cancelled' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleStartApprove}
              leftIcon={<CheckCircle2 size={14} className="text-emerald-600" />}
            >
              Marcar Aprovada
            </Button>
          )}

          {/* Dedicated Contract Actions */}
          {proposal.status === 'approved' && !relatedContract && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleGenerateContractDirect}
              disabled={generatingContract}
              leftIcon={<FileSignature size={15} />}
            >
              {generatingContract ? 'Gerando Contrato...' : 'Gerar Contrato'}
            </Button>
          )}

          {relatedContract && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onViewContract?.(relatedContract.id)}
              leftIcon={<FileSignature size={15} className="text-[#12e000]" />}
            >
              Ver Contrato ({relatedContract.number})
            </Button>
          )}

          {proposal.status !== 'rejected' && proposal.status !== 'approved' && proposal.status !== 'cancelled' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleStatusTransition('rejected', 'Recusada')}
              leftIcon={<XCircle size={14} className="text-rose-600" />}
            >
              Recusada
            </Button>
          )}

          {proposal.status !== 'cancelled' && (
            <Button
              variant="danger"
              size="sm"
              onClick={handleCancelProposal}
              leftIcon={<Ban size={14} />}
            >
              Cancelar
            </Button>
          )}

          <Button
            variant="danger"
            size="sm"
            onClick={() => setDeleteModalOpen(true)}
            leftIcon={<Trash2 size={14} />}
            className="!bg-rose-600 hover:!bg-rose-700 !text-white"
            title="Excluir esta proposta comercial"
          >
            Excluir Proposta
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHistory(prev => !prev)}
            leftIcon={<History size={14} />}
          >
            Histórico ({historyList.length})
          </Button>
        </div>
      </div>

      {/* Contract Snapshot / Divergence Card (hidden during print) */}
      {relatedContract && (
        <div className="no-print p-4 rounded-2xl border border-slate-200/90 bg-white shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#12e000] shrink-0">
                <FileSignature size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Contrato Vinculado</span>
                  <span className="font-mono text-sm font-extrabold text-slate-900">{relatedContract.number}</span>
                  <ContractStatusBadge status={relatedContract.status} />
                  <span className="text-xs text-slate-400">v{relatedContract.currentVersion || 1}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                  <span>Valor contratual: <strong>{formatCurrency(relatedContract.finalAmount)}</strong></span>
                  <span>•</span>
                  <span>Criado em {formatDate(relatedContract.createdAt)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Financial release status pill */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 border border-slate-200">
                <DollarSign size={14} className={relatedContract.financialReleaseStatus === 'released' ? 'text-emerald-600' : relatedContract.financialReleaseStatus === 'ready_for_release' ? 'text-blue-600' : 'text-amber-600'} />
                <span className="text-slate-700">
                  {relatedContract.financialReleaseStatus === 'released' && 'Financeiro Liberado'}
                  {relatedContract.financialReleaseStatus === 'ready_for_release' && 'Pronto p/ Faturamento'}
                  {(!relatedContract.financialReleaseStatus || relatedContract.financialReleaseStatus === 'pending_signature') && 'Aguardando Assinatura'}
                </span>
              </div>

              {onViewContract && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onViewContract(relatedContract.id)}
                  leftIcon={<ExternalLink size={14} />}
                >
                  Abrir Contrato
                </Button>
              )}
            </div>
          </div>

          {/* Divergence Alert if Proposal amounts changed after contract generation */}
          {Number(relatedContract.finalAmount) !== Number(proposal.finalAmount) && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
              <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Divergência de Valores Detectada:</strong> A proposta atual está em{' '}
                <strong className="underline">{formatCurrency(proposal.finalAmount)}</strong>, mas o contrato{' '}
                {relatedContract.number} foi gerado com{' '}
                <strong className="underline">{formatCurrency(relatedContract.finalAmount)}</strong>. Se os serviços ou descontos foram alterados, acesse o contrato para criar uma nova versão atualizada.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Audit History Drawer if toggled */}
      {showHistory && (
        <div className="no-print p-4 rounded-2xl border border-slate-200 bg-slate-50/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <History size={14} className="text-emerald-600" />
              Linha do Tempo e Histórico de Status
            </h4>
            <span className="text-[11px] text-slate-400">
              Registrado permanentemente para auditoria
            </span>
          </div>

          <div className="divide-y divide-slate-200/60 max-h-48 overflow-y-auto">
            {historyList.map((h: any) => (
              <div key={h.id} className="py-2 text-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="font-bold text-slate-800 uppercase text-[10px]">
                    {h.newStatus}
                  </span>
                  {h.reason && <span className="text-slate-600 italic">- {h.reason}</span>}
                </div>
                <div className="text-[11px] text-slate-400 shrink-0">
                  Por <strong className="text-slate-600">{h.changedBy}</strong> em {formatDateTime(h.createdAt)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Visualização Formal A4 */}
      <div className="flex justify-center print:block print:w-full print:m-0 print:p-0">
        <ProposalPreviewA4 proposal={proposal} settings={currentSettings} />
      </div>

      {/* Modal: Proposta Aprovada -> Deseja Gerar Contrato? */}
      <Modal
        isOpen={approveModalOpen}
        onClose={() => setApproveModalOpen(false)}
        title="Proposta Aprovada!"
        subtitle="Deseja gerar a minuta oficial do contrato agora?"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs flex items-start gap-3">
            <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm text-emerald-900">Parabéns pela aprovação comercial!</p>
              <p className="text-emerald-800 mt-1">
                Ao gerar o contrato agora, o sistema criará a minuta formal numerada (CTR-AAAA-XXXX) com snapshot completo do cliente, serviços e condições comerciais da proposta.
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-600">
            Você pode gerar o contrato imediatamente para revisão de cláusulas ou apenas marcar a proposta como aprovada e gerar o contrato posteriormente.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setApproveModalOpen(false)}
            >
              Cancelar
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleConfirmApproveOnly}
            >
              Gerar depois
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={generatingContract}
              onClick={handleConfirmApproveWithContract}
              leftIcon={<FileSignature size={15} />}
            >
              {generatingContract ? 'Gerando...' : 'Gerar contrato'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Confirmação de Exclusão da Proposta */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => !isDeleting && setDeleteModalOpen(false)}
        title="Excluir Proposta Comercial"
        subtitle={proposal ? `Proposta ${proposal.number} • ${proposal.eventName}` : ''}
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2.5">
            <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="font-bold block text-sm">Atenção: Exclusão de Proposta</strong>
              <p>
                Deseja realmente excluir a proposta <strong>{proposal?.number}</strong>?
                Ela será removida da listagem de propostas ativas e do painel de controle.
              </p>
              {relatedContract && (
                <p className="text-amber-800 font-semibold pt-1">
                  Aviso: Esta proposta possui o contrato vinculado <strong>{relatedContract.number}</strong>.
                </p>
              )}
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
