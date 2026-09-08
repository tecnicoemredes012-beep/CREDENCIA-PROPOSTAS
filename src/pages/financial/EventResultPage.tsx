import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/Button';
import { LoadingState } from '../../components/ui/Loading';
import { Modal } from '../../components/ui/Modal';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { api } from '../../services/api';
import { EventFinancialResult } from '../../types';
import {
  Layers,
  Search,
  DollarSign,
  TrendingUp,
  TrendingDown,
  FileText,
  FileSignature,
  Download,
  Printer,
  ChevronRight,
  ExternalLink,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Paperclip
} from 'lucide-react';

interface EventResultPageProps {
  onViewProposal: (id: string) => void;
  onViewContract: (id: string) => void;
  onAddToast: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;
}

export function EventResultPage({
  onViewProposal,
  onViewContract,
  onAddToast
}: EventResultPageProps) {
  const [results, setResults] = useState<EventFinancialResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'lucro' | 'prejuizo'>('all');

  // Event detail modal state with tabs
  const [selectedEventName, setSelectedEventName] = useState<string | null>(null);
  const [eventDetails, setEventDetails] = useState<any | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<'resumo' | 'receitas' | 'despesas' | 'movimentacoes' | 'documentos'>('resumo');
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const data = await api.financial.getEventsResults();
      setResults(data);
    } catch (err: any) {
      onAddToast('error', 'Erro ao carregar resultados por evento: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  const openEventDetails = async (eventName: string) => {
    try {
      setSelectedEventName(eventName);
      setActiveDetailTab('resumo');
      setDetailLoading(true);
      const details = await api.financial.getEventResultDetails(eventName);
      setEventDetails(details);
    } catch (err: any) {
      onAddToast('error', 'Erro ao carregar detalhes do evento: ' + err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const filtered = results.filter(r => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const eventMatch = r.eventName.toLowerCase().includes(q);
      const clientMatch = r.clientName.toLowerCase().includes(q);
      const propMatch = r.proposalNumber?.toLowerCase().includes(q);
      const ctrMatch = r.contractNumber?.toLowerCase().includes(q);
      if (!eventMatch && !clientMatch && !propMatch && !ctrMatch) return false;
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'lucro' && r.financialStatus !== 'lucro') return false;
      if (statusFilter === 'prejuizo' && r.financialStatus !== 'prejuizo') return false;
    }

    return true;
  });

  if (loading) {
    return <LoadingState label="Calculando rentabilidade por evento..." />;
  }

  // Selected event summary from results list
  const activeEventSummary = results.find(r => r.eventName === selectedEventName);

  return (
    <div className="space-y-6">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Layers size={20} className="text-[#0a8900]" />
            Resultado Financeiro por Evento
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            DRE operacional por evento: receitas previstas e realizadas, custos operacionais e margem líquida.
          </p>
        </div>
      </div>

      {/* 2. Filter Controls */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome do evento, cliente, proposta ou contrato..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-emerald-500 bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition ${
              statusFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({results.length})
          </button>
          <button
            onClick={() => setStatusFilter('lucro')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition ${
              statusFilter === 'lucro' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            Com Lucro
          </button>
          <button
            onClick={() => setStatusFilter('prejuizo')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition ${
              statusFilter === 'prejuizo' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
            }`}
          >
            Com Prejuízo
          </button>
        </div>
      </div>

      {/* 3. Event Results Table */}
      <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-xs">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <Layers size={32} className="mx-auto text-slate-300" />
            <p className="text-xs font-semibold text-slate-600">Nenhum resultado de evento encontrado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-3">Evento</th>
                  <th className="py-3 px-3">Cliente</th>
                  <th className="py-3 px-3">Contrato / Proposta</th>
                  <th className="py-3 px-3 text-right">Receita Prevista</th>
                  <th className="py-3 px-3 text-right">Receita Realizada</th>
                  <th className="py-3 px-3 text-right">Despesa Paga</th>
                  <th className="py-3 px-3 text-right">Resultado Realizado</th>
                  <th className="py-3 px-3 text-right">Margem Realizada</th>
                  <th className="py-3 px-3 text-center">Situação</th>
                  <th className="py-3 px-3 text-right">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filtered.map((item, idx) => {
                  const isPrejuizo = item.financialStatus === 'prejuizo';
                  const isLucro = item.financialStatus === 'lucro';

                  return (
                    <tr
                      key={idx}
                      onClick={() => openEventDetails(item.eventName)}
                      className={`hover:bg-slate-50/80 transition cursor-pointer ${
                        isPrejuizo ? 'bg-rose-50/20' : ''
                      }`}
                    >
                      <td className="py-3.5 px-3 font-bold text-slate-900 max-w-[180px] truncate">
                        {item.eventName}
                      </td>
                      <td className="py-3.5 px-3 text-slate-700 max-w-[150px] truncate">
                        {item.clientName}
                      </td>
                      <td className="py-3.5 px-3 font-mono text-[11px]">
                        {item.contractNumber ? (
                          <span className="text-emerald-800 font-bold block">{item.contractNumber}</span>
                        ) : (
                          <span className="text-slate-400 block">-</span>
                        )}
                        {item.proposalNumber && (
                          <span className="text-slate-500 block">{item.proposalNumber}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-slate-900">
                        {formatCurrency(item.revenueExpected)}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-emerald-700 font-bold">
                        {formatCurrency(item.revenueReceived)}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-slate-700">
                        {formatCurrency(item.expensePaid)}
                      </td>
                      <td className={`py-3.5 px-3 text-right font-mono font-extrabold text-sm ${
                        item.resultRealized < 0 ? 'text-rose-600' : (item.resultRealized > 0 ? 'text-emerald-800' : 'text-slate-600')
                      }`}>
                        {formatCurrency(item.resultRealized)}
                      </td>
                      <td className={`py-3.5 px-3 text-right font-mono font-bold ${
                        item.marginRealizedPercent < 0 ? 'text-rose-600' : 'text-emerald-700'
                      }`}>
                        {item.marginRealizedPercent.toFixed(1)}%
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                          isLucro ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                          isPrejuizo ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {isLucro ? 'Lucro' : (isPrejuizo ? 'Prejuízo' : 'Equilíbrio')}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openEventDetails(item.eventName)}
                          rightIcon={<ChevronRight size={13} />}
                        >
                          Detalhes
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Modal: Detalhes do Evento com Abas (Resumo, Receitas, Despesas, Movimentações, Documentos) */}
      {selectedEventName && (
        <Modal
          isOpen={Boolean(selectedEventName)}
          onClose={() => setSelectedEventName(null)}
          title={`Resultado do Evento — ${selectedEventName}`}
          maxWidth="4xl"
        >
          {detailLoading || !eventDetails ? (
            <LoadingState label="Carregando dados detalhados do evento..." />
          ) : (
            <div className="space-y-5">
              {/* Tab Navigation */}
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <button
                  onClick={() => setActiveDetailTab('resumo')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    activeDetailTab === 'resumo' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Resumo
                </button>
                <button
                  onClick={() => setActiveDetailTab('receitas')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    activeDetailTab === 'receitas' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Receitas ({eventDetails.receivables?.length || 0})
                </button>
                <button
                  onClick={() => setActiveDetailTab('despesas')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    activeDetailTab === 'despesas' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Despesas ({eventDetails.payables?.length || 0})
                </button>
                <button
                  onClick={() => setActiveDetailTab('documentos')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    activeDetailTab === 'documentos' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Documentos ({eventDetails.officialReceipts?.length || 0})
                </button>
              </div>

              {/* ABA 1: RESUMO */}
              {activeDetailTab === 'resumo' && activeEventSummary && (
                <div className="space-y-4">
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-xs font-bold text-slate-500 uppercase block">Receita Total</span>
                      <div className="text-lg font-extrabold font-mono text-emerald-800 mt-1">
                        {formatCurrency(activeEventSummary.revenueReceived)}
                      </div>
                      <span className="text-[11px] text-slate-400">Previsto: {formatCurrency(activeEventSummary.revenueExpected)}</span>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-xs font-bold text-slate-500 uppercase block">Despesas Pagas</span>
                      <div className="text-lg font-extrabold font-mono text-slate-900 mt-1">
                        {formatCurrency(activeEventSummary.expensePaid)}
                      </div>
                      <span className="text-[11px] text-slate-400">Previsto: {formatCurrency(activeEventSummary.expenseExpected)}</span>
                    </div>

                    <div className={`p-4 rounded-xl border ${
                      activeEventSummary.resultRealized >= 0
                        ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                        : 'bg-rose-50/60 border-rose-200 text-rose-950'
                    }`}>
                      <span className="text-xs font-bold uppercase block">Resultado Realizado</span>
                      <div className="text-xl font-extrabold font-mono mt-1">
                        {formatCurrency(activeEventSummary.resultRealized)}
                      </div>
                      <span className="text-[11px] font-bold">Margem Líquida: {activeEventSummary.marginRealizedPercent.toFixed(1)}%</span>
                    </div>
                  </div>

                  {/* Calculations Details Table */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Resultado Previsto (Receita Prevista − Despesa Prevista):</span>
                      <span className="font-mono font-bold text-slate-900">{formatCurrency(activeEventSummary.resultExpected)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Margem Prevista:</span>
                      <span className="font-mono font-bold text-slate-900">{activeEventSummary.marginExpectedPercent.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Receita Pendente a Receber:</span>
                      <span className="font-mono font-bold text-blue-700">{formatCurrency(activeEventSummary.revenuePending)}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Despesas Pendentes a Pagar:</span>
                      <span className="font-mono font-bold text-amber-700">{formatCurrency(activeEventSummary.expensePending)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ABA 2: RECEITAS */}
              {activeDetailTab === 'receitas' && (
                <div className="space-y-3">
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Código</th>
                          <th className="py-2.5 px-3">Contrato</th>
                          <th className="py-2.5 px-3 text-right">Valor Final</th>
                          <th className="py-2.5 px-3 text-right">Recebido</th>
                          <th className="py-2.5 px-3 text-right">Saldo</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {eventDetails.receivables?.map((r: any) => (
                          <tr key={r.id}>
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{r.code}</td>
                            <td className="py-2.5 px-3 font-mono text-emerald-800 font-bold">{r.contractNumber || '-'}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-900">{formatCurrency(r.finalAmount)}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-bold">{formatCurrency(r.totalReceived)}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-700">{formatCurrency(r.balance)}</td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100">
                                {r.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ABA 3: DESPESAS */}
              {activeDetailTab === 'despesas' && (
                <div className="space-y-3">
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Código</th>
                          <th className="py-2.5 px-3">Descrição</th>
                          <th className="py-2.5 px-3">Fornecedor</th>
                          <th className="py-2.5 px-3">Categoria</th>
                          <th className="py-2.5 px-3 text-right">Valor</th>
                          <th className="py-2.5 px-3 text-right">Pago</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {eventDetails.payables?.map((p: any) => (
                          <tr key={p.id}>
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{p.code}</td>
                            <td className="py-2.5 px-3 font-medium text-slate-900">{p.description}</td>
                            <td className="py-2.5 px-3 text-slate-700">{p.supplierName}</td>
                            <td className="py-2.5 px-3 text-slate-600">{p.categoryName}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-900">{formatCurrency(p.amount)}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-bold">{formatCurrency(p.paidAmount)}</td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100">
                                {p.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ABA 4: DOCUMENTOS RELACIONADOS */}
              {activeDetailTab === 'documentos' && (
                <div className="space-y-3">
                  {/* Proposta & Contrato Links */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                      Instrumentos Comerciais e Contratuais
                    </span>
                    <div className="flex flex-wrap items-center gap-3">
                      {activeEventSummary?.proposalId && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onViewProposal(activeEventSummary.proposalId!)}
                          leftIcon={<FileText size={14} />}
                        >
                          Ver Proposta {activeEventSummary.proposalNumber}
                        </Button>
                      )}
                      {activeEventSummary?.contractId && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onViewContract(activeEventSummary.contractId!)}
                          leftIcon={<FileSignature size={14} />}
                        >
                          Ver Contrato {activeEventSummary.contractNumber}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Recibos Emitidos */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                      Recibos Oficiais Emitidos ({eventDetails.officialReceipts?.length || 0})
                    </span>
                    {eventDetails.officialReceipts?.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">Nenhum recibo emitido para este evento.</p>
                    ) : (
                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white">
                        {eventDetails.officialReceipts?.map((doc: any) => (
                          <div key={doc.id} className="p-3 flex items-center justify-between text-xs">
                            <div>
                              <span className="font-mono font-bold text-slate-900 block">{doc.receiptNumber}</span>
                              <span className="text-slate-500 text-[11px] block">
                                {formatDate(doc.receiptDate)} • {formatCurrency(doc.amount)} • {doc.clientName}
                              </span>
                            </div>
                            <a
                              href={`/api/financial/receipts/document/${doc.id}/pdf`}
                              download={`Recibo_${doc.receiptNumber}.pdf`}
                              className="cx-button-secondary inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer"
                            >
                              <Download size={13} />
                              Baixar PDF
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-3 border-t border-slate-200">
                <Button variant="secondary" onClick={() => setSelectedEventName(null)}>
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
