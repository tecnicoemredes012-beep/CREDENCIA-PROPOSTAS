import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Contract, SystemSettings } from '../types';
import { ContractStatusBadge } from '../components/contracts/ContractStatusBadge';
import { ContractPreviewA4 } from '../components/contracts/ContractPreviewA4';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { LoadingState } from '../components/ui/Loading';
import { formatDateTime, formatDate } from '../utils/formatters';
import {
  ArrowLeft,
  Edit,
  CheckCircle2,
  Send,
  FileCheck2,
  Download,
  Printer,
  ExternalLink,
  History,
  Upload,
  Copy,
  AlertTriangle,
  DollarSign,
  FileText,
  Paperclip,
  X
} from 'lucide-react';

interface ContractViewPageProps {
  contractId: string;
  onBack: () => void;
  onEditContract: (id: string) => void;
  onViewProposal: (id: string) => void;
  onAddToast: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;
  settings?: SystemSettings | null;
}

export function ContractViewPage({
  contractId,
  onBack,
  onEditContract,
  onViewProposal,
  onAddToast,
  settings
}: ContractViewPageProps) {
  const [contract, setContract] = useState<Contract | null>(null);
  const [currentSettings, setCurrentSettings] = useState<SystemSettings | null>(settings || null);
  const [loading, setLoading] = useState(true);
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

  // Modals
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [sendNotes, setSendNotes] = useState('Contrato enviado por e-mail para assinatura do cliente.');

  const [signModalOpen, setSignModalOpen] = useState(false);
  const [signDate, setSignDate] = useState(new Date().toISOString().split('T')[0]);
  const [signType, setSignType] = useState('physical');
  const [signNotes, setSignNotes] = useState('');

  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadNotes, setUploadNotes] = useState('');

  const [newVersionModalOpen, setNewVersionModalOpen] = useState(false);
  const [newVersionReason, setNewVersionReason] = useState('Revisão e readequação de cláusulas');

  const fetchContract = async () => {
    try {
      setLoading(true);
      const res = await api.contracts.get(contractId);
      setContract(res);
    } catch (err: any) {
      onAddToast('error', 'Erro ao carregar contrato: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContract();
  }, [contractId]);

  // Actions
  const handleFinalize = async () => {
    if (!contract) return;
    if (!confirm('Após a finalização, alterações deverão gerar uma nova versão do contrato. Deseja continuar e finalizar o documento?')) return;

    try {
      onAddToast('info', 'Finalizando contrato...');
      await api.contracts.finalize(contract.id, 'Administrador');
      onAddToast('success', 'Contrato finalizado com sucesso.');
      fetchContract();
    } catch (err: any) {
      onAddToast('error', err.message);
    }
  };

  const handleSendConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract) return;
    try {
      await api.contracts.send(contract.id, sendNotes, 'Administrador');
      onAddToast('success', 'Envio do contrato registrado.');
      setSendModalOpen(false);
      fetchContract();
    } catch (err: any) {
      onAddToast('error', 'Erro ao registrar envio: ' + err.message);
    }
  };

  const handleSignConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract) return;
    try {
      await api.contracts.sign(contract.id, {
        signatureDate: signDate,
        signatureType: signType,
        signatureNotes: signNotes,
        performedBy: 'Administrador'
      });
      onAddToast('success', 'Contrato marcado como assinado! Processo pronto para liberação financeira.');
      setSignModalOpen(false);
      fetchContract();
    } catch (err: any) {
      onAddToast('error', 'Erro ao registrar assinatura: ' + err.message);
    }
  };

  const handleUploadConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract || !uploadFileName.trim()) {
      onAddToast('warning', 'Informe o nome do arquivo anexado.');
      return;
    }
    try {
      await api.contracts.uploadSigned(contract.id, {
        fileName: uploadFileName.trim(),
        fileType: uploadFileName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
        fileSize: 1024 * 1024 * 2.5, // 2.5 MB placeholder representation
        notes: uploadNotes || 'Contrato assinado digitalizado',
        performedBy: 'Administrador'
      });
      onAddToast('success', 'Contrato assinado anexado com sucesso!');
      setUploadModalOpen(false);
      fetchContract();
    } catch (err: any) {
      onAddToast('error', 'Erro ao anexar contrato assinado: ' + err.message);
    }
  };

  const handleNewVersionConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract) return;
    try {
      const res = await api.contracts.newVersion(contract.id, newVersionReason, 'Administrador');
      onAddToast('success', `Nova versão ${res.newVersion} criada com sucesso.`);
      setNewVersionModalOpen(false);
      fetchContract();
    } catch (err: any) {
      onAddToast('error', 'Erro ao criar nova versão: ' + err.message);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading || !contract) {
    return <LoadingState label="Carregando visualização do contrato..." />;
  }

  const isEditable = contract.status !== 'signed' && contract.status !== 'active' && contract.status !== 'closed';
  const historyList = contract.history || [];
  const versionsList = contract.versions || [];
  const attachmentsList = contract.attachments || [];

  return (
    <div className="space-y-6 print:space-y-0 print:w-full print:m-0 print:p-0">
      {/* 1. Administrative Action Toolbar (hidden during print) */}
      <div className="no-print p-4 rounded-2xl border border-slate-200/80 bg-white shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Left Back and Contract Identification */}
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={onBack} leftIcon={<ArrowLeft size={16} />}>
            Voltar
          </Button>

          <div className="flex items-center gap-2">
            <span className="font-mono text-base font-extrabold text-slate-900">
              {contract.number}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold border border-slate-200 font-mono">
              v{contract.currentVersion}
            </span>
            <ContractStatusBadge status={contract.status} />
          </div>
        </div>

        {/* Action Buttons Matching Credencia Style */}
        <div className="flex flex-wrap items-center gap-2">
          {isEditable && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onEditContract(contract.id)}
              leftIcon={<Edit size={15} />}
            >
              Editar
            </Button>
          )}

          {isEditable && contract.status !== 'finalized' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleFinalize}
              leftIcon={<CheckCircle2 size={15} className="text-blue-600" />}
            >
              Finalizar
            </Button>
          )}

          {isEditable && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setNewVersionModalOpen(true)}
              leftIcon={<Copy size={15} />}
            >
              Nova Versão
            </Button>
          )}

          {contract.status !== 'sent' && contract.status !== 'signed' && contract.status !== 'active' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSendModalOpen(true)}
              leftIcon={<Send size={14} className="text-purple-600" />}
            >
              Registrar Envio
            </Button>
          )}

          {contract.status !== 'signed' && contract.status !== 'active' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setUploadModalOpen(true)}
              leftIcon={<Upload size={14} className="text-emerald-700" />}
            >
              Anexar Assinado
            </Button>
          )}

          {contract.status !== 'signed' && contract.status !== 'active' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSignModalOpen(true)}
              leftIcon={<FileCheck2 size={14} className="text-[#0a8900]" />}
            >
              Marcar Assinado
            </Button>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={handlePrint}
            leftIcon={<Printer size={15} />}
          >
            Imprimir
          </Button>

          <a
            href={`/api/contracts/${contract.id}/pdf?view=inline`}
            target="_blank"
            rel="noopener noreferrer"
            className="cx-button-secondary inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer"
            title="Visualizar documento oficial em nova aba"
          >
            <ExternalLink size={14} className="text-slate-600" />
            Visualizar PDF
          </a>

          <a
            href={`/api/contracts/${contract.id}/pdf`}
            download={`Contrato_${contract.number}.pdf`}
            className="cx-button-primary inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer"
            title="Baixar contrato formal em PDF (.pdf)"
            onClick={() => onAddToast('info', 'Baixando PDF oficial do contrato...')}
          >
            <Download size={15} />
            Gerar e Baixar PDF
          </a>

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

      {/* 2. Proposal Alteration Warning Banner (if original proposal was modified after generation) */}
      {contract.proposalWasModified && (
        <div className="no-print p-4 rounded-2xl border border-amber-300 bg-amber-50 text-amber-900 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-600 shrink-0" />
            <div>
              <span className="font-bold">Aviso de Divergência:</span> A proposta vinculada{' '}
              <strong>{contract.proposalNumber}</strong> foi alterada após a geração deste contrato.
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => onViewProposal(contract.proposalId)}>
              Abrir Proposta
            </Button>
            {isEditable && (
              <Button variant="primary" size="sm" onClick={() => setNewVersionModalOpen(true)}>
                Criar Nova Versão
              </Button>
            )}
          </div>
        </div>
      )}

      {/* 3. Financial Release Status Card */}
      <div className="no-print p-4 rounded-2xl border border-slate-200/90 bg-white shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            contract.financialReleaseStatus === 'ready_for_release' || contract.status === 'signed'
              ? 'bg-[#efffed] text-[#0a8900]'
              : 'bg-slate-100 text-slate-400'
          }`}>
            <DollarSign size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-slate-800 uppercase tracking-wide">
                Integração com o Módulo Financeiro
              </span>
              {contract.status === 'signed' || contract.financialReleaseStatus === 'ready_for_release' ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                  Pronto para Liberação
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-bold">
                  Aguardando Assinatura do Contrato
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {contract.status === 'signed' || contract.financialReleaseStatus === 'ready_for_release'
                ? 'Contrato assinado. O processo está pronto para liberação financeira e faturamento.'
                : 'A liberação financeira das faturas exige a formalização e assinatura deste contrato.'}
            </p>
          </div>
        </div>

        <div>
          <button
            disabled
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed flex items-center gap-1.5"
            title="O módulo financeiro definitivo será disponibilizado na próxima etapa"
          >
            <DollarSign size={14} />
            Gerar Financeiro (Em breve)
          </button>
        </div>
      </div>

      {/* 4. Signed Document Attachment Card (if uploaded) */}
      {attachmentsList.length > 0 && (
        <div className="no-print p-4 rounded-2xl border border-emerald-200/80 bg-emerald-50/40 shadow-xs flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <Paperclip size={18} className="text-emerald-700" />
            <div>
              <span className="font-bold text-slate-900 block">
                Documento Assinado Anexado: {attachmentsList[0].fileName}
              </span>
              <span className="text-[11px] text-slate-500 block">
                Enviado por {attachmentsList[0].uploadedBy} em {formatDateTime(attachmentsList[0].createdAt)}
              </span>
            </div>
          </div>
          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-300">
            Documento Arquivado
          </span>
        </div>
      )}

      {/* 5. Audit History and Versions Drawer if toggled */}
      {showHistory && (
        <Card className="no-print p-4 border border-slate-200 bg-slate-50/90 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <History size={14} className="text-emerald-700" />
              Linha do Tempo e Histórico de Auditoria
            </h4>
            <span className="text-[11px] text-slate-400">
              Registrado permanentemente no banco de dados
            </span>
          </div>

          <div className="divide-y divide-slate-200/70 max-h-56 overflow-y-auto pr-1 text-xs">
            {historyList.map((h: any) => (
              <div key={h.id} className="py-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="font-bold text-slate-800">{h.action}:</span>
                  <span className="text-slate-600">{h.details}</span>
                </div>
                <div className="text-[11px] text-slate-400 shrink-0">
                  Por <strong className="text-slate-600">{h.performedBy}</strong> em {formatDateTime(h.createdAt)}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 6. Formal A4 Document Preview */}
      <div className="flex justify-center print:block print:w-full print:m-0 print:p-0">
        <ContractPreviewA4 contract={contract} settings={currentSettings} />
      </div>

      {/* Modal: Registrar Envio */}
      {sendModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <form onSubmit={handleSendConfirm} className="relative w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Send size={16} className="text-purple-600" />
                Registrar Envio do Contrato
              </h3>
              <button type="button" onClick={() => setSendModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Confirme o envio da via formal do contrato para análise e assinatura do cliente.
            </p>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Observações do Envio:</label>
              <textarea
                rows={3}
                value={sendNotes}
                onChange={(e) => setSendNotes(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#12e000]"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setSendModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" size="sm">
                Confirmar Envio
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Marcar Assinado */}
      {signModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <form onSubmit={handleSignConfirm} className="relative w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <FileCheck2 size={16} className="text-[#0a8900]" />
                Registrar Assinatura do Contrato
              </h3>
              <button type="button" onClick={() => setSignModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Data da Assinatura:</label>
                <input
                  type="date"
                  value={signDate}
                  onChange={(e) => setSignDate(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#12e000]"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Tipo de Assinatura:</label>
                <select
                  value={signType}
                  onChange={(e) => setSignType(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#12e000]"
                >
                  <option value="physical">Assinatura Física (Caneta/Papel)</option>
                  <option value="external_electronic">Eletrônica Externa (Clicksign, DocuSign, etc.)</option>
                  <option value="digital_certificate">Digital Certificada (ICP-Brasil / e-CNPJ)</option>
                  <option value="other">Outro formato validado</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Observações adicionais:</label>
                <textarea
                  rows={2}
                  value={signNotes}
                  onChange={(e) => setSignNotes(e.target.value)}
                  placeholder="Ex.: Assinado via plataforma digital pelo representante legal"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#12e000]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setSignModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" size="sm">
                Marcar como Assinado
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Anexar Contrato Assinado */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <form onSubmit={handleUploadConfirm} className="relative w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Upload size={16} className="text-emerald-700" />
                Anexar Contrato Assinado
              </h3>
              <button type="button" onClick={() => setUploadModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Identificação do Arquivo:</label>
                <input
                  type="text"
                  value={uploadFileName}
                  onChange={(e) => setUploadFileName(e.target.value)}
                  placeholder="Ex.: Contrato_CTR-2026-0001_Assinado_Cliente.pdf"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#12e000]"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Observações do Arquivamento:</label>
                <textarea
                  rows={2}
                  value={uploadNotes}
                  onChange={(e) => setUploadNotes(e.target.value)}
                  placeholder="Ex.: Via original digitalizada com rubricas e carimbo da contratante"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#12e000]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setUploadModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" size="sm">
                Salvar Anexo e Confirmar
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Nova Versão */}
      {newVersionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <form onSubmit={handleNewVersionConfirm} className="relative w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Copy size={16} className="text-emerald-700" />
                Criar Nova Versão do Contrato
              </h3>
              <button type="button" onClick={() => setNewVersionModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              A versão atual (v{contract.currentVersion}) será arquivada permanentemente no histórico e uma nova versão (v{contract.currentVersion + 1}) será criada para revisão.
            </p>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Motivo da Nova Versão:</label>
              <textarea
                rows={3}
                value={newVersionReason}
                onChange={(e) => setNewVersionReason(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#12e000]"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setNewVersionModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" size="sm">
                Gerar Versão {contract.currentVersion + 1}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
