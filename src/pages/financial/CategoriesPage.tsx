import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/Button';
import { LoadingState } from '../../components/ui/Loading';
import { Modal } from '../../components/ui/Modal';
import { api } from '../../services/api';
import { FinancialCategory } from '../../types';
import {
  Tag,
  Plus,
  CheckCircle2,
  XCircle,
  Edit2,
  Lock,
  Layers
} from 'lucide-react';

interface CategoriesPageProps {
  onAddToast: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;
}

export function CategoriesPage({ onAddToast }: CategoriesPageProps) {
  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<FinancialCategory | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<'expense' | 'revenue'>('expense');
  const [color, setColor] = useState('#0284c7');

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await api.financial.getCategories({ all: true });
      setCategories(data);
    } catch (err: any) {
      onAddToast('error', 'Erro ao carregar categorias: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleOpenCreate = () => {
    setEditingCat(null);
    setName('');
    setType('expense');
    setColor('#0284c7');
    setModalOpen(true);
  };

  const handleOpenEdit = (cat: FinancialCategory) => {
    setEditingCat(cat);
    setName(cat.name);
    setType(cat.type);
    setColor(cat.color || '#0284c7');
    setModalOpen(true);
  };

  const handleToggleActive = async (cat: FinancialCategory) => {
    try {
      const res = await api.financial.toggleCategory(cat.id);
      onAddToast('success', res.isActive ? 'Categoria ativada.' : 'Categoria desativada.');
      fetchCategories();
    } catch (err: any) {
      onAddToast('error', 'Erro ao alterar status: ' + err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      if (editingCat) {
        await api.financial.updateCategory(editingCat.id, { name: name.trim(), color });
        onAddToast('success', 'Categoria atualizada com sucesso.');
      } else {
        await api.financial.createCategory({ name: name.trim(), type, color });
        onAddToast('success', 'Categoria cadastrada com sucesso.');
      }
      setModalOpen(false);
      fetchCategories();
    } catch (err: any) {
      onAddToast('error', 'Erro ao salvar categoria: ' + err.message);
    }
  };

  if (loading) {
    return <LoadingState label="Carregando categorias financeiras..." />;
  }

  const expenses = categories.filter(c => c.type === 'expense');
  const revenues = categories.filter(c => c.type === 'revenue');

  return (
    <div className="space-y-6">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Tag size={20} className="text-blue-600" />
            Categorias Financeiras
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Classificação operacional das despesas e receitas para apuração de custos por evento.
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={handleOpenCreate} leftIcon={<Plus size={14} />}>
          Nova Categoria
        </Button>
      </div>

      {/* 2. Expenses Categories Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Categorias de Despesas Operacionais ({expenses.length})
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {expenses.map(c => (
            <div
              key={c.id}
              className={`p-3.5 rounded-xl border bg-white flex items-center justify-between transition ${
                c.isActive ? 'border-slate-200 shadow-2xs' : 'border-slate-100 bg-slate-50/60 opacity-60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-3.5 h-3.5 rounded-full shrink-0"
                  style={{ backgroundColor: c.color || '#64748b' }}
                />
                <div>
                  <span className={`text-xs font-bold block ${c.isActive ? 'text-slate-900' : 'text-slate-500'}`}>
                    {c.name}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {c.isSystem ? 'Padrão do Sistema' : 'Personalizada'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleOpenEdit(c)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                  title="Editar Categoria"
                >
                  <Edit2 size={13} />
                </button>
                <button
                  onClick={() => handleToggleActive(c)}
                  className={`p-1 rounded-md transition ${
                    c.isActive
                      ? 'text-emerald-600 hover:bg-emerald-50'
                      : 'text-slate-400 hover:bg-slate-100'
                  }`}
                  title={c.isActive ? 'Desativar' : 'Ativar'}
                >
                  {c.isActive ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Revenue Categories Section */}
      <div className="space-y-3 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Categorias de Receitas ({revenues.length})
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {revenues.map(c => (
            <div
              key={c.id}
              className={`p-3.5 rounded-xl border bg-white flex items-center justify-between transition ${
                c.isActive ? 'border-slate-200 shadow-2xs' : 'border-slate-100 bg-slate-50/60 opacity-60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-3.5 h-3.5 rounded-full shrink-0"
                  style={{ backgroundColor: c.color || '#12e000' }}
                />
                <div>
                  <span className={`text-xs font-bold block ${c.isActive ? 'text-slate-900' : 'text-slate-500'}`}>
                    {c.name}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {c.isSystem ? 'Padrão do Sistema' : 'Personalizada'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleOpenEdit(c)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                  title="Editar Categoria"
                >
                  <Edit2 size={13} />
                </button>
                <button
                  onClick={() => handleToggleActive(c)}
                  className={`p-1 rounded-md transition ${
                    c.isActive
                      ? 'text-emerald-600 hover:bg-emerald-50'
                      : 'text-slate-400 hover:bg-slate-100'
                  }`}
                  title={c.isActive ? 'Desativar' : 'Ativar'}
                >
                  {c.isActive ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Modal: Nova / Editar */}
      {modalOpen && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingCat ? 'Editar Categoria' : 'Nova Categoria Financeira'}
          maxWidth="sm"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                Nome da Categoria *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Transporte de Equipamentos"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
              />
            </div>

            {!editingCat && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                  Tipo de Categoria *
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                >
                  <option value="expense">Despesa Operacional</option>
                  <option value="revenue">Receita</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                Cor de Identificação
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer border border-slate-200"
                />
                <span className="font-mono text-xs text-slate-600">{color}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="secondary" size="sm" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" size="sm">
                Salvar Categoria
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
