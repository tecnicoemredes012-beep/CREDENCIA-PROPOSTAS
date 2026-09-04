import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Contract, ContractStatus, SystemSettings } from '../types';
import { ContractStatusBadge } from '../components/contracts/ContractStatusBadge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { LoadingState } from '../components/ui/Loading';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  FileSignature,
  Clock,
  Send,
  FileCheck2,
  Search,
  Filter,
  Eye,
  Edit,
  Download,
  Printer,
  ExternalLink,
  Upload,
  CheckCircle2,
  FileText
} from 'lucide-react';

interface ContractsListPageProps {
  onViewContract: (id: string) => void;
  onEditContract: (id: string) => void;
  onViewProposal: (id: string) => void;
  onAddToast: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;
  settings?: SystemSettings | null;
}

export function ContractsListPage({
  onViewContract,
  onEditContract,
  onViewProposal,
  onAddToast,
  settings
}: ContractsListPageProps) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const fetchContracts = async () => {
    try {
      setLoading(true);
      const res = await api.contracts.list({
        search: search.trim() || undefined,
        status: statusFilter || undefined
      });
      setContracts(res);
    } catch (err: any) {
      onAddToast('error', 'Erro ao carregar contratos: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchContracts();
  };

  // Metrics
  const totalContracts = contracts.length;
  const inReviewCount = contracts.filter(c => c.status === 'in_review' || c.status === 'draft').length;
  const sentCount = contracts.filter(c => c.status === 'sent').length;
  const signedOrActiveCount = contracts.filter(c => c.status === 'signed' || c.status === 'active').length;

  return (
    <div className="space-y-6">
      {/* 1. Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border border-slate-200/80 bg-white shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Total de Contratos</span>
            <span className="text-2xl font-extrabold text-slate-900 mt-0.5 block">{totalContracts}</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <FileSignature size={22} />
          </div>
        </Card>

        <Card className="p-4 border border-slate-200/80 bg-white shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 block">Rascunho / Em Revisão</span>
            <span className="text-2xl font-extrabold text-slate-900 mt-0.5 block">{inReviewCount}</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock size={22} />
          </div>
        </Card>

        <Card className="p-4 border border-slate-200/80 bg-white shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 block">Enviados ao Cliente</span>
            <span className="text-2xl font-extrabold text-slate-900 mt-0.5 block">{sentCount}</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Send size={22} />
          </div>
        </Card>

        <Card className="p-4 border border-slate-200/80 bg-white shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#0a8900] block">Assinados / Ativos</span>
            <span className="text-2xl font-extrabold text-slate-900 mt-0.5 block">{signedOrActiveCount}</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-[#efffed] text-[#0a8900] flex items-center justify-center">
            <FileCheck2 size={22} />
          </div>
        </Card>
      </div>

      {/* 2. Filters & Search Bar */}
      <Card className="p-4 border border-slate-200/80 bg-white shadow-xs">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input
              type="text"
              placeholder="Buscar por número do contrato, proposta, cliente ou evento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#12e000]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#12e000] text-slate-700"
            >
              <option value="">Todos os status</option>
              <option value="draft">Rascunho</option>
              <option value="in_review">Em Revisão</option>
              <option value="finalized">Finalizado</option>
              <option value="sent">Enviado</option>
              <option value="signed">Assinado</option>
              <option value="active">Ativo</option>
              <option value="cancelled">Cancelado</option>
              <option value="closed">Encerrado</option>
            </select>

            <Button type="submit" variant="secondary" size="sm" leftIcon={<Filter size={15} />}>
              Filtrar
            </Button>
          </div>
        </form>
      </Card>

      {/* 3. Contracts List Table */}
      <Card className="border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12">
            <LoadingState label="Carregando contratos..." />
          </div>
        ) : contracts.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <FileSignature size={28} />
            </div>
            <h3 className="text-base font-bold text-slate-800">Nenhum contrato encontrado</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Para gerar um contrato, acesse o módulo de <strong>Propostas</strong>, abra uma proposta aprovada e clique em <strong>Gerar Contrato</strong>.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Contrato</th>
                  <th className="py-3 px-4">Proposta</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Evento</th>
                  <th className="py-3 px-4">Valor Total</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contracts.map((c) => {
                  const client = c.clientSnapshot || {};
                  const event = c.eventSnapshot || {};
                  const proposal = c.proposalSnapshot || {};

                  return (
                    <tr
                      key={c.id}
                      onClick={() => onViewContract(c.id)}
                      className="hover:bg-slate-50/70 transition cursor-pointer group"
                    >
                      {/* Number */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-mono font-extrabold text-slate-900 group-hover:text-emerald-700 transition">
                          {c.number}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          v{c.currentVersion} • {formatDate(c.createdAt)}
                        </span>
                      </td>

                      {/* Proposal reference */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewProposal(c.proposalId);
                          }}
                          className="font-mono text-xs font-bold text-emerald-800 hover:text-emerald-950 underline decoration-dotted flex items-center gap-1 cursor-pointer"
                          title="Abrir proposta comercial de origem"
                        >
                          <FileText size={13} />
                          {c.proposalNumber}
                        </button>
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
                          {event.name || '-'}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {event.city ? `${event.city} - ${event.state || ''}` : 'Local a definir'}
                        </div>
                      </td>

                      {/* Value */}
                      <td className="py-3 px-4 whitespace-nowrap font-mono font-bold text-slate-900">
                        {formatCurrency(proposal.finalAmount || 0)}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <ContractStatusBadge status={c.status} size="sm" />
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onViewContract(c.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
                            title="Visualizar contrato"
                          >
                            <Eye size={15} />
                          </button>

                          {c.status !== 'signed' && c.status !== 'active' && (
                            <button
                              onClick={() => onEditContract(c.id)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
                              title="Editar cláusulas do contrato"
                            >
                              <Edit size={15} />
                            </button>
                          )}

                          <a
                            href={`/api/contracts/${c.id}/pdf`}
                            download={`Contrato_${c.number}.pdf`}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition"
                            title="Baixar PDF oficial"
                          >
                            <Download size={15} />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
