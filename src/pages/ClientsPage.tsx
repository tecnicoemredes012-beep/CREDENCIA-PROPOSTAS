import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Client } from '../types';
import { Button } from '../components/ui/Button';
import { LoadingState } from '../components/ui/Loading';
import { ClientFormModal } from '../components/clients/ClientFormModal';
import { formatDocument, formatPhone } from '../utils/formatters';
import {
  Users,
  Search,
  Plus,
  Edit,
  Trash2,
  Mail,
  Phone,
  Building,
  MapPin
} from 'lucide-react';

interface ClientsPageProps {
  onAddToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

export function ClientsPage({ onAddToast }: ClientsPageProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const res = await api.clients.list(search);
      setClients(res);
    } catch (err: any) {
      onAddToast('error', 'Erro ao carregar clientes: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchClients();
  };

  const handleOpenCreate = () => {
    setEditingClient(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (client: Client) => {
    setEditingClient(client);
    setIsModalOpen(true);
  };

  const handleSave = async (clientData: Partial<Client>) => {
    try {
      if (editingClient) {
        await api.clients.update(editingClient.id, clientData);
        onAddToast('success', 'Cliente atualizado com sucesso!');
      } else {
        await api.clients.create(clientData);
        onAddToast('success', 'Cliente cadastrado com sucesso!');
      }
      fetchClients();
    } catch (err: any) {
      onAddToast('error', err.message || 'Erro ao salvar cliente');
      throw err;
    }
  };

  const handleDelete = async (client: Client) => {
    if (!confirm(`Deseja realmente remover o cliente "${client.name}"?`)) return;

    try {
      await api.clients.delete(client.id);
      onAddToast('success', 'Cliente excluído com sucesso.');
      fetchClients();
    } catch (err: any) {
      onAddToast('error', 'Erro ao excluir cliente: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-extrabold text-slate-900 tracking-tight">
            Cadastro de Clientes
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Gerencie os dados cadastrais, contatos e faturamento de clientes
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          leftIcon={<Plus size={16} />}
          onClick={handleOpenCreate}
        >
          Novo Cliente
        </Button>
      </div>

      {/* Search Bar */}
      <div className="p-4 rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur-md shadow-xs">
        <form onSubmit={handleSearchSubmit} className="flex gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por razão social, nome fantasia, CNPJ, responsável ou e-mail..."
              className="w-full pl-10 pr-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white outline-none focus:border-emerald-500"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">
            Buscar
          </Button>
        </form>
      </div>

      {/* Clients Table / Cards */}
      <div className="cx-card border border-slate-200/80 overflow-hidden">
        {loading ? (
          <LoadingState label="Carregando clientes..." />
        ) : clients.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Building size={40} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold">Nenhum cliente cadastrado.</p>
            <Button variant="primary" size="sm" onClick={handleOpenCreate} className="mt-3">
              Cadastrar Primeiro Cliente
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200/70 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4">Razão Social & Nome Fantasia</th>
                  <th className="py-3 px-4 w-36">CNPJ / CPF</th>
                  <th className="py-3 px-4">Responsável & Cargo</th>
                  <th className="py-3 px-4">Contato (E-mail & Telefone)</th>
                  <th className="py-3 px-4 w-32">Localização</th>
                  <th className="py-3 px-4 w-24 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clients.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4">
                      <div className="font-extrabold text-slate-900 leading-snug">
                        {c.name}
                      </div>
                      {c.tradeName && (
                        <div className="text-[11px] text-slate-500">
                          {c.tradeName}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-700 font-bold whitespace-nowrap">
                      {formatDocument(c.document)}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{c.contactPerson}</div>
                      {c.role && <div className="text-[10px] text-slate-400">{c.role}</div>}
                    </td>

                    <td className="py-3 px-4">
                      <div className="text-slate-800 font-medium">{c.email}</div>
                      <div className="text-[10px] text-slate-500">{formatPhone(c.phone)}</div>
                    </td>

                    <td className="py-3 px-4 text-slate-600">
                      {[c.city, c.state].filter(Boolean).join(' - ') || '—'}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(c)}
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                          title="Editar dados do cliente"
                        >
                          <Edit size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(c)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition cursor-pointer"
                          title="Excluir cliente"
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
      <ClientFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        client={editingClient}
      />
    </div>
  );
}
