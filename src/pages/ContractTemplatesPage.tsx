import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ContractTemplate, TemplateClause } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { LoadingState } from '../components/ui/Loading';
import { Field, inputClassName, textareaClassName } from '../components/ui/Form';
import {
  FileCode,
  Plus,
  ArrowUp,
  ArrowDown,
  Trash2,
  Edit,
  Save,
  CheckCircle2,
  AlertCircle,
  Variable,
  Info,
  Layers,
  ArrowLeft
} from 'lucide-react';

interface ContractTemplatesPageProps {
  onBack?: () => void;
  onAddToast: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;
}

export function ContractTemplatesPage({ onBack, onAddToast }: ContractTemplatesPageProps) {
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);
  const [clauses, setClauses] = useState<TemplateClause[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Edit clause modal
  const [editClauseModalOpen, setEditClauseModalOpen] = useState(false);
  const [editingClauseIndex, setEditingClauseIndex] = useState<number | null>(null);
  const [clauseTitle, setClauseTitle] = useState('');
  const [clauseNumber, setClauseNumber] = useState('');
  const [clauseContent, setClauseContent] = useState('');
  const [isMandatory, setIsMandatory] = useState(false);

  // Variable cheatsheet drawer
  const [showVariablesDrawer, setShowVariablesDrawer] = useState(false);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await api.contractTemplates.list();
      setTemplates(res);
      if (res.length > 0) {
        const full = await api.contractTemplates.get(res[0].id);
        setSelectedTemplate(full);
        setClauses(full.clauses || []);
      }
    } catch (err: any) {
      onAddToast('error', 'Erro ao carregar modelos de contrato: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleSelectTemplate = async (tmpl: ContractTemplate) => {
    try {
      setLoading(true);
      const full = await api.contractTemplates.get(tmpl.id);
      setSelectedTemplate(full);
      setClauses(full.clauses || []);
    } catch (err: any) {
      onAddToast('error', 'Erro ao carregar cláusulas do modelo: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMoveClause = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= clauses.length) return;

    const updated = [...clauses];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);

    // Reorder indices
    const reordered = updated.map((c, idx) => ({ ...c, displayOrder: idx + 1 }));
    setClauses(reordered);
  };

  const handleToggleActive = (index: number) => {
    setClauses(prev => prev.map((c, i) => i === index ? { ...c, isActive: !c.isActive } : c));
  };

  const handleOpenAddClause = () => {
    setEditingClauseIndex(null);
    setClauseTitle('');
    setClauseNumber(`CLÁUSULA ${clauses.length + 1}ª`);
    setClauseContent('');
    setIsMandatory(false);
    setEditClauseModalOpen(true);
  };

  const handleOpenEditClause = (index: number) => {
    const clause = clauses[index];
    setEditingClauseIndex(index);
    setClauseTitle(clause.title);
    setClauseNumber(clause.clauseNumber || `CLÁUSULA ${index + 1}ª`);
    setClauseContent(clause.content);
    setIsMandatory(clause.isMandatory || false);
    setEditClauseModalOpen(true);
  };

  const handleSaveClauseModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clauseTitle.trim() || !clauseContent.trim()) {
      onAddToast('warning', 'Título e conteúdo da cláusula são obrigatórios.');
      return;
    }

    if (editingClauseIndex !== null) {
      // Edit existing
      setClauses(prev => prev.map((c, i) => i === editingClauseIndex ? {
        ...c,
        title: clauseTitle.trim(),
        clauseNumber: clauseNumber.trim(),
        content: clauseContent.trim(),
        isMandatory
      } : c));
      onAddToast('info', 'Cláusula atualizada.');
    } else {
      // Add new
      const newClause: TemplateClause = {
        id: 'new-' + Date.now(),
        templateId: selectedTemplate?.id || 'default',
        clauseNumber: clauseNumber.trim(),
        title: clauseTitle.trim(),
        content: clauseContent.trim(),
        displayOrder: clauses.length + 1,
        isMandatory,
        isActive: true
      };
      setClauses(prev => [...prev, newClause]);
      onAddToast('success', 'Nova cláusula adicionada ao modelo.');
    }

    setEditClauseModalOpen(false);
  };

  const handleDeleteClause = (index: number) => {
    if (clauses[index].isMandatory) {
      if (!confirm('Atenção: Esta cláusula está marcada como obrigatória. Deseja realmente removê-la do modelo padrão?')) {
        return;
      }
    } else {
      if (!confirm(`Remover "${clauses[index].title}" do modelo padrão?`)) return;
    }

    setClauses(prev => prev.filter((_, i) => i !== index).map((c, idx) => ({ ...c, displayOrder: idx + 1 })));
    onAddToast('info', 'Cláusula removida.');
  };

  const handleSaveAllClauses = async () => {
    if (!selectedTemplate) return;
    try {
      setSaving(true);
      await api.contractTemplates.updateClauses(selectedTemplate.id, clauses);
      onAddToast('success', 'Cláusulas do modelo padrão salvas com sucesso!');
    } catch (err: any) {
      onAddToast('error', 'Erro ao salvar modelo: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading && !selectedTemplate) {
    return <LoadingState label="Carregando modelos de contrato..." />;
  }

  const availableVariables = [
    { tag: '{{NUMERO_CONTRATO}}', desc: 'Número sequencial anual (ex: CTR-2026-0001)' },
    { tag: '{{DATA_EMISSAO}}', desc: 'Data de emissão da proposta / contrato' },
    { tag: '{{DATA_ASSINATURA}}', desc: 'Data da assinatura formal do contrato' },
    { tag: '{{CONTRATANTE_RAZAO_SOCIAL}}', desc: 'Razão Social ou Nome completo do cliente' },
    { tag: '{{CONTRATANTE_CNPJ}}', desc: 'CNPJ ou CPF formatado do contratante' },
    { tag: '{{CONTRATANTE_ENDERECO}}', desc: 'Endereço completo do contratante' },
    { tag: '{{CONTRATANTE_REPRESENTANTE}}', desc: 'Responsável legal do cliente contratante' },
    { tag: '{{CONTRATADA_RAZAO_SOCIAL}}', desc: 'Razão social oficial da Credencia' },
    { tag: '{{CONTRATADA_CNPJ}}', desc: 'CNPJ oficial da Credencia' },
    { tag: '{{CONTRATADA_REPRESENTANTE}}', desc: 'Representante legal cadastrado da Credencia' },
    { tag: '{{NOME_EVENTO}}', desc: 'Nome oficial do evento contratado' },
    { tag: '{{LOCAL_EVENTO}}', desc: 'Local e endereço onde ocorrerá o evento' },
    { tag: '{{DATA_EVENTO}}', desc: 'Período formatado de realização do evento' },
    { tag: '{{TABELA_SERVICOS}}', desc: 'Tabela formatada de serviços, quantidades e totais' },
    { tag: '{{VALOR_TOTAL}}', desc: 'Valor total bruto da contratação' },
    { tag: '{{VALOR_FINAL}}', desc: 'Valor final líquido com descontos aplicados' },
    { tag: '{{CONDICOES_PAGAMENTO}}', desc: 'Forma e prazos de pagamento acordados' },
    { tag: '{{FORO_ELEICAO}}', desc: 'Comarca/Foro de eleição jurídica' },
  ];

  return (
    <div className="space-y-6 max-w-6xl pb-16">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="secondary" size="sm" onClick={onBack} leftIcon={<ArrowLeft size={16} />}>
              Voltar
            </Button>
          )}
          <div>
            <h2 className="font-display text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <FileCode className="text-[#12e000]" size={22} />
              Modelos e Minutas Padrão de Contrato
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Gerencie a biblioteca de cláusulas e variáveis automáticas utilizadas na geração de novos contratos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowVariablesDrawer(prev => !prev)}
            leftIcon={<Variable size={16} className="text-purple-600" />}
          >
            {showVariablesDrawer ? 'Ocultar Variáveis' : 'Variáveis Dinâmicas'}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleOpenAddClause}
            leftIcon={<Plus size={16} />}
          >
            Adicionar Cláusula
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleSaveAllClauses}
            disabled={saving}
            leftIcon={<Save size={16} />}
          >
            {saving ? 'Salvando...' : 'Salvar Minuta Padrão'}
          </Button>
        </div>
      </div>

      {/* Variables drawer */}
      {showVariablesDrawer && (
        <div className="p-4 rounded-2xl border border-purple-200/80 bg-purple-50/50 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
              <Variable size={15} />
              Tabela de Variáveis Disponíveis no Sistema
            </h4>
            <span className="text-[11px] text-purple-700">
              Copie e cole os marcadores abaixo no texto das cláusulas para substituição automática
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
            {availableVariables.map((v, i) => (
              <div key={i} className="p-2 rounded-lg bg-white border border-purple-100 flex flex-col gap-0.5">
                <code className="text-[11px] font-bold text-purple-800 bg-purple-50 px-1 py-0.5 rounded select-all w-fit">
                  {v.tag}
                </code>
                <span className="text-[10px] text-slate-500">{v.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Template Selector Card */}
      <div className="cx-card p-4 border border-slate-200/80 bg-white flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#12e000] shrink-0">
            <Layers size={20} />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Modelo Selecionado</span>
            <h3 className="text-sm font-bold text-slate-900">{selectedTemplate?.name || 'Modelo Padrão Credencia'}</h3>
            <p className="text-xs text-slate-500">{selectedTemplate?.description || 'Minuta jurídica oficial para serviços de credenciamento'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Total de cláusulas:</span>
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 font-mono text-xs font-bold text-slate-800">
            {clauses.length} cláusulas ({clauses.filter(c => c.isActive).length} ativas)
          </span>
        </div>
      </div>

      {/* Clause list */}
      <div className="space-y-3">
        {clauses.map((clause, idx) => (
          <div
            key={clause.id || idx}
            className={`p-4 rounded-2xl border transition ${
              clause.isActive
                ? 'border-slate-200/90 bg-white hover:border-slate-300 shadow-xs'
                : 'border-slate-200 bg-slate-50/70 opacity-60'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                  {clause.clauseNumber || `CLÁUSULA ${idx + 1}ª`}
                </span>
                <h4 className="text-sm font-bold text-slate-900">
                  {clause.title}
                </h4>
                {clause.isMandatory && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                    Obrigatória
                  </span>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleMoveClause(idx, 'up')}
                  disabled={idx === 0}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                  title="Mover para cima"
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveClause(idx, 'down')}
                  disabled={idx === clauses.length - 1}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                  title="Mover para baixo"
                >
                  <ArrowDown size={14} />
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleActive(idx)}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-bold cursor-pointer transition ${
                    clause.isActive
                      ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                      : 'text-slate-500 bg-slate-100 hover:bg-slate-200'
                  }`}
                  title="Ativar ou desativar esta cláusula no modelo padrão"
                >
                  {clause.isActive ? 'Ativa' : 'Inativa'}
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenEditClause(idx)}
                  className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                  title="Editar texto da cláusula"
                >
                  <Edit size={14} />
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteClause(idx)}
                  className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition cursor-pointer"
                  title="Remover cláusula"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Content snippet */}
            <p className="text-xs text-slate-600 whitespace-pre-line line-clamp-3 leading-relaxed">
              {clause.content}
            </p>
          </div>
        ))}

        {clauses.length === 0 && (
          <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-slate-200 space-y-2">
            <FileCode size={32} className="mx-auto text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">Nenhuma cláusula cadastrada no modelo</p>
            <p className="text-xs text-slate-400">Clique em "Adicionar Cláusula" para compor a minuta do contrato.</p>
          </div>
        )}
      </div>

      {/* Edit Clause Modal */}
      <Modal
        isOpen={editClauseModalOpen}
        onClose={() => setEditClauseModalOpen(false)}
        title={editingClauseIndex !== null ? 'Editar Cláusula do Modelo' : 'Nova Cláusula no Modelo'}
        subtitle="Defina o título, numeração e texto com suporte a variáveis dinâmicas"
        maxWidth="lg"
      >
        <form onSubmit={handleSaveClauseModal} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Identificador / Número" required hint="Ex: CLÁUSULA 1ª">
              <input
                type="text"
                value={clauseNumber}
                onChange={e => setClauseNumber(e.target.value)}
                className={`${inputClassName} font-mono uppercase font-bold`}
                required
              />
            </Field>

            <div className="sm:col-span-2">
              <Field label="Título da Cláusula" required hint="Ex: DO OBJETO DO CONTRATO">
                <input
                  type="text"
                  value={clauseTitle}
                  onChange={e => setClauseTitle(e.target.value)}
                  className={`${inputClassName} font-bold`}
                  required
                />
              </Field>
            </div>
          </div>

          <Field
            label="Conteúdo da Cláusula"
            required
            hint="Você pode usar tags como {{CONTRATANTE_RAZAO_SOCIAL}}, {{VALOR_FINAL}}, etc."
          >
            <textarea
              rows={8}
              value={clauseContent}
              onChange={e => setClauseContent(e.target.value)}
              className={textareaClassName}
              required
            />
          </Field>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isMandatoryCheck"
              checked={isMandatory}
              onChange={e => setIsMandatory(e.target.checked)}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
            <label htmlFor="isMandatoryCheck" className="text-xs text-slate-700 font-semibold cursor-pointer">
              Cláusula Obrigatória (adverte caso o operador tente remover em minutas específicas)
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setEditClauseModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              leftIcon={<Save size={15} />}
            >
              Salvar Cláusula
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
