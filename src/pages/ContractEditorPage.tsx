import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Contract, ContractClause, SystemSettings } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { LoadingState } from '../components/ui/Loading';
import { ContractPreviewA4 } from '../components/contracts/ContractPreviewA4';
import { buildVariableMap, validateContractReady, ContractInterpolationContext } from '../utils/contractVariables';
import {
  ArrowLeft,
  Save,
  Plus,
  ArrowUp,
  ArrowDown,
  Copy,
  Trash2,
  RotateCcw,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Variable,
  FileSignature
} from 'lucide-react';

interface ContractEditorPageProps {
  contractId: string;
  onBack: () => void;
  onViewContract: (id: string) => void;
  onAddToast: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;
  settings?: SystemSettings | null;
}

export function ContractEditorPage({
  contractId,
  onBack,
  onViewContract,
  onAddToast,
  settings
}: ContractEditorPageProps) {
  const [contract, setContract] = useState<Contract | null>(null);
  const [currentSettings, setCurrentSettings] = useState<SystemSettings | null>(settings || null);
  const [clauses, setClauses] = useState<ContractClause[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showVariablesDrawer, setShowVariablesDrawer] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

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

  const fetchContract = async () => {
    try {
      setLoading(true);
      const res = await api.contracts.get(contractId);
      setContract(res);
      setClauses(res.clauses || []);
    } catch (err: any) {
      onAddToast('error', 'Erro ao carregar contrato para edição: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContract();
  }, [contractId]);

  // Clause manipulation
  const handleUpdateClause = (index: number, field: keyof ContractClause, value: any) => {
    setClauses(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setClauses(prev => {
      const updated = [...prev];
      const temp = updated[index - 1];
      updated[index - 1] = updated[index];
      updated[index] = temp;
      return updated.map((c, idx) => ({ ...c, orderIndex: idx + 1 }));
    });
  };

  const handleMoveDown = (index: number) => {
    if (index === clauses.length - 1) return;
    setClauses(prev => {
      const updated = [...prev];
      const temp = updated[index + 1];
      updated[index + 1] = updated[index];
      updated[index] = temp;
      return updated.map((c, idx) => ({ ...c, orderIndex: idx + 1 }));
    });
  };

  const handleDuplicateClause = (index: number) => {
    const target = clauses[index];
    const duplicated: ContractClause = {
      ...target,
      id: 'clause-' + Date.now(),
      title: `${target.title} (Cópia)`,
      orderIndex: index + 2
    };
    setClauses(prev => {
      const updated = [...prev];
      updated.splice(index + 1, 0, duplicated);
      return updated.map((c, idx) => ({ ...c, orderIndex: idx + 1 }));
    });
    onAddToast('info', 'Cláusula duplicada.');
  };

  const handleRemoveClause = (index: number) => {
    if (clauses.length <= 1) {
      onAddToast('warning', 'O contrato deve ter pelo menos uma cláusula.');
      return;
    }
    if (!confirm('Deseja realmente remover esta cláusula do contrato?')) return;
    setClauses(prev => {
      return prev.filter((_, idx) => idx !== index).map((c, idx) => ({ ...c, orderIndex: idx + 1 }));
    });
    onAddToast('info', 'Cláusula removida.');
  };

  const handleAddClause = () => {
    const nextNum = clauses.length + 1;
    const newClause: ContractClause = {
      id: 'clause-' + Date.now(),
      clauseNumber: nextNum,
      title: `Cláusula ${nextNum}ª — Nova Cláusula`,
      content: 'Inserir conteúdo da nova cláusula aqui...',
      orderIndex: nextNum,
      isActive: true,
      isMandatory: false
    };
    setClauses(prev => [...prev, newClause]);
    onAddToast('success', 'Nova cláusula adicionada ao final do contrato.');
  };

  const handleRestoreTemplateClauses = async () => {
    if (!confirm('Deseja restaurar as cláusulas para o texto padrão do modelo oficial? Todas as edições manuais deste rascunho serão substituídas.')) return;
    try {
      const templates = await api.contractTemplates.list();
      if (templates.length > 0) {
        const fullTemplate = await api.contractTemplates.get(templates[0].id);
        if (fullTemplate.clauses && fullTemplate.clauses.length > 0) {
          setClauses(fullTemplate.clauses.map((c: any, idx: number) => ({ ...c, orderIndex: idx + 1 })));
          onAddToast('success', 'Cláusulas restauradas com o padrão do modelo Credencia.');
        }
      }
    } catch (err: any) {
      onAddToast('error', 'Falha ao restaurar cláusulas: ' + err.message);
    }
  };

  const handleSave = async () => {
    if (!contract) return;
    try {
      setSaving(true);
      await api.contracts.update(contract.id, {
        clauses,
        title: contract.title
      });
      onAddToast('success', 'Cláusulas e contrato salvos com sucesso.');
      fetchContract();
    } catch (err: any) {
      onAddToast('error', 'Erro ao salvar contrato: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !contract) {
    return <LoadingState label="Carregando editor de contrato..." />;
  }

  // Calculate missing fields/variables in real-time
  const client = contract.clientSnapshot || {};
  const contractor = contract.contractorSnapshot || settings || {};
  const event = contract.eventSnapshot || {};
  const proposal = contract.proposalSnapshot || {};
  const items = contract.servicesSnapshot || [];

  const interpCtx: ContractInterpolationContext = {
    contractNumber: contract.number,
    proposalNumber: contract.proposalNumber,
    client,
    contractor,
    event,
    financial: {
      finalAmount: proposal.finalAmount || 0,
      subtotal: proposal.subtotal || 0,
      discountAmount: proposal.discountAmount || 0,
      paymentMethod: proposal.paymentMethod || 'Boleto bancário',
      paymentTerms: proposal.paymentTerms || 'Faturamento em 30 dias'
    },
    items,
    signature: {
      date: contract.signatureDate,
      city: contract.signatureCity
    }
  };

  const varMap = buildVariableMap(interpCtx);
  const missingValidation = validateContractReady(interpCtx, clauses);

  return (
    <div className="space-y-6">
      {/* 1. Header Toolbar */}
      <div className="p-4 rounded-2xl border border-slate-200/80 bg-white shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={onBack} leftIcon={<ArrowLeft size={16} />}>
            Voltar
          </Button>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-extrabold text-slate-900">
                {contract.number}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold border border-slate-200">
                Versão {contract.currentVersion}
              </span>
            </div>
            <span className="text-[11px] text-slate-500">
              Proposta Vinculada: <strong>{contract.proposalNumber}</strong> • Cliente: <strong>{client.name || client.tradeName}</strong>
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowVariablesDrawer(prev => !prev)}
            leftIcon={<Variable size={15} className="text-emerald-600" />}
          >
            Ver Variáveis ({Object.keys(varMap).length})
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleRestoreTemplateClauses}
            leftIcon={<RotateCcw size={15} />}
          >
            Restaurar Padrão
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPreviewModalOpen(true)}
            leftIcon={<Eye size={15} />}
          >
            Visualizar A4
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={saving}
            leftIcon={<Save size={15} />}
          >
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </div>

      {/* 2. Validation Alert Banner if missing data */}
      {missingValidation.length > 0 ? (
        <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/70 text-amber-900 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-800">
            <AlertTriangle size={17} className="text-amber-600" />
            <span>Campos ou variáveis pendentes antes da finalização:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] text-amber-700">
            {missingValidation.map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="p-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 text-emerald-800 text-xs flex items-center gap-2 font-bold">
          <CheckCircle2 size={16} className="text-[#12e000]" />
          <span>Todas as variáveis e dados essenciais do contrato estão devidamente preenchidos e válidos.</span>
        </div>
      )}

      {/* 3. Variables Cheat-Sheet Drawer if open */}
      {showVariablesDrawer && (
        <Card className="p-4 border border-slate-200 bg-slate-50/90 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Variable size={15} className="text-emerald-700" />
              Tabela de Variáveis Disponíveis no Contrato
            </h4>
            <span className="text-[11px] text-slate-400">
              Digite as tags exatamente como indicado nos textos das cláusulas
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
            {Object.entries(varMap).map(([key, val]) => (
              <div key={key} className="p-2 rounded-lg bg-white border border-slate-200 text-xs">
                <span className="font-mono text-[11px] font-bold text-emerald-800 select-all block">
                  {`{{${key}}}`}
                </span>
                <span className="text-[10px] text-slate-600 truncate block mt-0.5" title={val}>
                  {val || '(Vazio)'}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 4. Clause Blocks List */}
      <div className="space-y-4">
        {clauses.map((clause, idx) => (
          <Card
            key={clause.id || idx}
            className={`p-5 border transition-all ${
              clause.isActive ? 'border-slate-200/90 bg-white shadow-xs' : 'border-slate-200/50 bg-slate-50/70 opacity-60'
            }`}
          >
            {/* Clause Top Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-900 font-bold text-xs flex items-center justify-center font-mono">
                  {clause.clauseNumber || idx + 1}
                </span>
                <input
                  type="text"
                  value={clause.title}
                  onChange={(e) => handleUpdateClause(idx, 'title', e.target.value)}
                  className="font-bold text-xs sm:text-sm text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-[#12e000] focus:outline-none px-1 py-0.5 transition w-72 sm:w-96"
                />
              </div>

              {/* Clause Control Buttons */}
              <div className="flex items-center gap-1">
                {/* Active Toggle */}
                <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 mr-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={clause.isActive}
                    onChange={(e) => handleUpdateClause(idx, 'isActive', e.target.checked)}
                    className="rounded text-[#12e000] focus:ring-[#12e000]"
                  />
                  <span>{clause.isActive ? 'Ativa' : 'Inativa'}</span>
                </label>

                <button
                  onClick={() => handleMoveUp(idx)}
                  disabled={idx === 0}
                  className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30"
                  title="Mover para cima"
                >
                  <ArrowUp size={15} />
                </button>

                <button
                  onClick={() => handleMoveDown(idx)}
                  disabled={idx === clauses.length - 1}
                  className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30"
                  title="Mover para baixo"
                >
                  <ArrowDown size={15} />
                </button>

                <button
                  onClick={() => handleDuplicateClause(idx)}
                  className="p-1 rounded text-slate-400 hover:text-slate-700"
                  title="Duplicar cláusula"
                >
                  <Copy size={15} />
                </button>

                <button
                  onClick={() => handleRemoveClause(idx)}
                  className="p-1 rounded text-slate-400 hover:text-rose-600"
                  title="Remover cláusula"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>

            {/* Clause Content Area */}
            {clause.clauseNumber === 3 ? (
              <div className="space-y-2">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                  <p className="font-bold text-slate-900 mb-1">Grade Oficial de Serviços Contratados (Importada da Proposta):</p>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-600">
                    {items.map((it: any, i: number) => (
                      <li key={i}>
                        <strong>{it.serviceName}</strong>: {it.quantity} {it.unit} (R$ {Number(it.total).toFixed(2)})
                      </li>
                    ))}
                  </ul>
                  <p className="text-[10px] text-slate-400 mt-2">
                    A tabela oficial com quantidades, descrições e subtotais será gerada automaticamente na visualização A4 e no PDF.
                  </p>
                </div>
                <textarea
                  rows={2}
                  value={clause.content}
                  onChange={(e) => handleUpdateClause(idx, 'content', e.target.value)}
                  placeholder="Texto introdutório ou notas da cláusula de serviços..."
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#12e000] font-sans leading-relaxed text-slate-800"
                />
              </div>
            ) : (
              <textarea
                rows={clause.content.length > 250 ? 5 : 3}
                value={clause.content}
                onChange={(e) => handleUpdateClause(idx, 'content', e.target.value)}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#12e000] font-sans leading-relaxed text-slate-800"
              />
            )}
          </Card>
        ))}

        {/* Add Clause Button at Bottom */}
        <div className="text-center pt-2">
          <Button variant="secondary" size="sm" onClick={handleAddClause} leftIcon={<Plus size={15} />}>
            Adicionar Nova Cláusula
          </Button>
        </div>
      </div>

      {/* 5. Floating Preview Modal */}
      {previewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-5xl bg-slate-100 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <FileSignature size={18} className="text-emerald-700" />
                Pré-Visualização do Documento A4
              </h3>
              <Button variant="secondary" size="sm" onClick={() => setPreviewModalOpen(false)}>
                Fechar
              </Button>
            </div>

            <div className="flex justify-center">
              <ContractPreviewA4 contract={contract} clauses={clauses} settings={currentSettings} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
