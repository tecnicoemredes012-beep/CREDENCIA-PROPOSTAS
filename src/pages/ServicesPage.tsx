import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ServiceItem } from '../types';
import { Button } from '../components/ui/Button';
import { LoadingState } from '../components/ui/Loading';
import { ServiceFormModal } from '../components/services/ServiceFormModal';
import { formatCurrency } from '../utils/formatters';
import {
  Layers,
  Search,
  Plus,
  Edit,
  Trash2,
  Tag,
  CheckCircle2,
  XCircle
} from 'lucide-react';

interface ServicesPageProps {
  onAddToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

export function ServicesPage({ onAddToast }: ServicesPageProps) {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const res = await api.services.list({
        search: search.trim() || undefined,
        category: categoryFilter || undefined
      });
      setServices(res);
    } catch (err: any) {
      onAddToast('error', 'Erro ao listar catálogo de serviços: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, [categoryFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchServices();
  };

  const handleOpenCreate = () => {
    setEditingService(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (service: ServiceItem) => {
    setEditingService(service);
    setIsModalOpen(true);
  };

  const handleSave = async (serviceData: Partial<ServiceItem>) => {
    try {
      if (editingService) {
        await api.services.update(editingService.id, serviceData);
        onAddToast('success', 'Serviço atualizado com sucesso!');
      } else {
        await api.services.create(serviceData);
        onAddToast('success', 'Novo serviço cadastrado no catálogo!');
      }
      fetchServices();
    } catch (err: any) {
      onAddToast('error', err.message || 'Erro ao salvar serviço');
      throw err;
    }
  };

  const handleDelete = async (service: ServiceItem) => {
    if (!confirm(`Deseja realmente remover o serviço "${service.name}" do catálogo?`)) return;

    try {
      await api.services.delete(service.id);
      onAddToast('success', 'Serviço removido com sucesso.');
      fetchServices();
    } catch (err: any) {
      onAddToast('error', 'Erro ao excluir serviço: ' + err.message);
    }
  };

  const categories = Array.from(new Set(services.map(s => s.category).filter(Boolean)));

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-extrabold text-slate-900 tracking-tight">
            Catálogo Oficial de Serviços
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Gerencie o escopo padrão, unidades de cobrança e valores de referência do Credencia
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          leftIcon={<Plus size={16} />}
          onClick={handleOpenCreate}
        >
          Novo Serviço
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur-md shadow-xs">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome, descrição ou categoria..."
              className="w-full pl-10 pr-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white outline-none focus:border-emerald-500"
            />
          </div>

          <div className="sm:w-48">
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="">Todas as categorias</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <Button type="submit" variant="secondary" size="sm">
            Buscar
          </Button>
        </form>
      </div>

      {/* Services List / Cards */}
      <div className="cx-card border border-slate-200/80 overflow-hidden">
        {loading ? (
          <LoadingState label="Carregando catálogo de serviços..." />
        ) : services.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Layers size={40} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold">Nenhum serviço encontrado no catálogo.</p>
            <Button variant="primary" size="sm" onClick={handleOpenCreate} className="mt-3">
              Cadastrar Primeiro Serviço
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200/70 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4">Nome & Escopo do Serviço</th>
                  <th className="py-3 px-4 w-32">Categoria</th>
                  <th className="py-3 px-4 w-28 text-center">Unidade</th>
                  <th className="py-3 px-4 w-32 text-right">Valor Padrão</th>
                  <th className="py-3 px-4 w-28 text-center">Status</th>
                  <th className="py-3 px-4 w-24 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {services.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4">
                      <div className="font-extrabold text-slate-900 leading-snug">
                        {s.name}
                      </div>
                      <div className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                        {s.defaultDescription}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-wider">
                        {s.category}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center font-semibold text-slate-600">
                      {s.unit}
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-slate-900 text-right whitespace-nowrap">
                      {formatCurrency(s.unitPrice)}
                    </td>

                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {s.isActive ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 text-[10px] font-bold uppercase bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 size={11} />
                          Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-500 text-[10px] font-bold uppercase bg-slate-100 px-2 py-0.5 rounded-full">
                          <XCircle size={11} />
                          Inativo
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(s)}
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                          title="Editar serviço"
                        >
                          <Edit size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(s)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition cursor-pointer"
                          title="Excluir serviço"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      <ServiceFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        service={editingService}
      />
    </div>
  );
}
