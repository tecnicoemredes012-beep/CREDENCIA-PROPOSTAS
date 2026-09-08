import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/Button';
import { LoadingState } from '../../components/ui/Loading';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { api } from '../../services/api';
import { CashFlowEntry } from '../../types';
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  List,
  Filter,
  DollarSign,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface CashFlowPageProps {
  initialViewType?: 'previsto' | 'realizado';
  onAddToast: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;
}

export function CashFlowPage({
  initialViewType = 'previsto',
  onAddToast
}: CashFlowPageProps) {
  const [viewType, setViewType] = useState<'previsto' | 'realizado'>(initialViewType);
  const [displayFormat, setDisplayFormat] = useState<'list' | 'calendar'>('list');
  const [period, setPeriod] = useState<string>('month');
  const [flowType, setFlowType] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  const [data, setData] = useState<{
    totalEntradas: number;
    totalSaidas: number;
    saldoLiquido: number;
    items: CashFlowEntry[];
  } | null>(null);

  const fetchFlow = async () => {
    try {
      setLoading(true);
      const res = await api.financial.getCashFlow({
        viewType,
        period,
        flowType: flowType === 'all' ? undefined : flowType
      });
      setData(res);
    } catch (err: any) {
      onAddToast('error', 'Erro ao carregar fluxo de caixa: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlow();
  }, [viewType, period, flowType]);

  if (loading || !data) {
    return <LoadingState label="Carregando projeção de fluxo de caixa..." />;
  }

  // Group items by date for calendar view
  const itemsByDate: { [date: string]: CashFlowEntry[] } = {};
  data.items.forEach(item => {
    if (!itemsByDate[item.date]) itemsByDate[item.date] = [];
    itemsByDate[item.date].push(item);
  });

  return (
    <div className="space-y-6">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <TrendingUp size={20} className="text-[#0a8900]" />
            Fluxo de Caixa
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Demonstrativo de entradas, saídas e saldo acumulado com comutação rigorosa entre Previsto e Realizado.
          </p>
        </div>

        {/* View Type Toggle (PREVISTO vs REALIZADO) */}
        <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
          <button
            onClick={() => setViewType('previsto')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition select-none ${
              viewType === 'previsto'
                ? 'bg-white text-slate-950 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Fluxo Previsto (A Vencer)
          </button>
          <button
            onClick={() => setViewType('realizado')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition select-none ${
              viewType === 'realizado'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Fluxo Realizado (Efetivado)
          </button>
        </div>
      </div>

      {/* 2. Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Entradas */}
        <div className="p-4 rounded-2xl bg-white border border-emerald-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-500">
            <span>Total de Entradas ({viewType === 'realizado' ? 'Recebido' : 'Previsto'})</span>
            <ArrowUpRight size={16} className="text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold font-mono text-emerald-800">
            +{formatCurrency(data.totalEntradas)}
          </div>
        </div>

        {/* Saídas */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-500">
            <span>Total de Saídas ({viewType === 'realizado' ? 'Pago' : 'Previsto'})</span>
            <ArrowDownRight size={16} className="text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold font-mono text-slate-900">
            -{formatCurrency(data.totalSaidas)}
          </div>
        </div>

        {/* Saldo Líquido do Período */}
        <div className={`p-4 rounded-2xl border shadow-xs ${
          data.saldoLiquido >= 0 ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950' : 'bg-rose-50/50 border-rose-200 text-rose-950'
        }`}>
          <div className="flex items-center justify-between text-xs font-bold uppercase">
            <span>Saldo Líquido ({viewType})</span>
            <DollarSign size={16} />
          </div>
          <div className={`mt-2 text-2xl font-extrabold font-mono ${
            data.saldoLiquido >= 0 ? 'text-emerald-800' : 'text-rose-600'
          }`}>
            {formatCurrency(data.saldoLiquido)}
          </div>
        </div>
      </div>

      {/* 3. Filter Controls & Format Selector */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-slate-600">Período:</span>
          {['today', 'week', 'month', 'previous_month', 'next_month'].map(p => {
            const labels: any = {
              today: 'Hoje',
              week: 'Esta Semana',
              month: 'Este Mês',
              previous_month: 'Mês Anterior',
              next_month: 'Próximo Mês'
            };
            return (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-xl font-bold transition ${
                  period === p ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {labels[p]}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          {/* Flow Type selector */}
          <select
            value={flowType}
            onChange={(e) => setFlowType(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium bg-white"
          >
            <option value="all">Todas as Operações</option>
            <option value="entrada">Somente Entradas</option>
            <option value="saida">Somente Saídas</option>
          </select>

          {/* List vs Calendar switch */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              onClick={() => setDisplayFormat('list')}
              className={`p-1.5 rounded-lg transition ${
                displayFormat === 'list' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Visualização em Lista"
            >
              <List size={15} />
            </button>
            <button
              onClick={() => setDisplayFormat('calendar')}
              className={`p-1.5 rounded-lg transition ${
                displayFormat === 'calendar' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Visualização em Calendário"
            >
              <Calendar size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Display Content: List View or Calendar View */}
      {displayFormat === 'list' ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-xs">
          {data.items.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <TrendingUp size={32} className="mx-auto text-slate-300" />
              <p className="text-xs font-semibold text-slate-600">Nenhum lançamento no período selecionado.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-3">Data</th>
                    <th className="py-3 px-3">Tipo</th>
                    <th className="py-3 px-3">Cliente / Fornecedor</th>
                    <th className="py-3 px-3">Evento / Descrição</th>
                    <th className="py-3 px-3">Forma</th>
                    <th className="py-3 px-3 text-right">Valor Operação</th>
                    <th className="py-3 px-3 text-right">Saldo Acumulado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {data.items.map((item) => {
                    const isEntrada = item.type === 'entrada';
                    const amount = viewType === 'realizado' ? item.amountRealized : item.amountExpected;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-3 font-mono text-slate-600">
                          {formatDate(item.date)}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isEntrada ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {isEntrada ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                            {isEntrada ? 'Entrada' : 'Saída'}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-900">
                          {item.partyName}
                        </td>
                        <td className="py-3 px-3 text-slate-700">
                          <span className="block font-medium">{item.description}</span>
                          {item.eventName && (
                            <span className="text-[10px] text-slate-500 block">{item.eventName}</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          {item.paymentMethod}
                        </td>
                        <td className={`py-3 px-3 text-right font-mono font-extrabold ${
                          isEntrada ? 'text-emerald-700' : 'text-slate-900'
                        }`}>
                          {isEntrada ? '+' : '-'} {formatCurrency(amount)}
                        </td>
                        <td className={`py-3 px-3 text-right font-mono font-extrabold text-sm ${
                          (item.accumulatedBalance || 0) >= 0 ? 'text-emerald-800' : 'text-rose-600'
                        }`}>
                          {formatCurrency(item.accumulatedBalance || 0)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* CALENDAR VIEW */
        <div className="p-6 rounded-2xl border border-slate-200/80 bg-white shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
              Visão Mensal de Movimentações ({viewType})
            </span>
            <span className="text-[11px] text-slate-500">
              Total de {Object.keys(itemsByDate).length} dias com operações
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.keys(itemsByDate).sort().map(dateStr => {
              const dayItems = itemsByDate[dateStr];
              const dayEntradas = dayItems.filter(i => i.type === 'entrada').reduce((s, i) => s + (viewType === 'realizado' ? i.amountRealized : i.amountExpected), 0);
              const daySaidas = dayItems.filter(i => i.type === 'saida').reduce((s, i) => s + (viewType === 'realizado' ? i.amountRealized : i.amountExpected), 0);

              return (
                <div key={dateStr} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="font-bold font-mono text-slate-900">{formatDate(dateStr)}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200 text-slate-700">
                      {dayItems.length} ops
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {dayItems.map(di => (
                      <div key={di.id} className="flex items-center justify-between text-[11px]">
                        <span className="truncate max-w-[160px] text-slate-700">
                          {di.description}
                        </span>
                        <span className={`font-mono font-bold ${
                          di.type === 'entrada' ? 'text-emerald-700' : 'text-slate-800'
                        }`}>
                          {di.type === 'entrada' ? '+' : '-'} {formatCurrency(viewType === 'realizado' ? di.amountRealized : di.amountExpected)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-[11px]">
                    <span className="text-slate-500">Total do Dia:</span>
                    <span className={`font-mono ${
                      dayEntradas - daySaidas >= 0 ? 'text-emerald-800' : 'text-rose-600'
                    }`}>
                      {formatCurrency(dayEntradas - daySaidas)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
