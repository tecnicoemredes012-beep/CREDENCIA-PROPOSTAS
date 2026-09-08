import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LoadingState } from '../../components/ui/Loading';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { api } from '../../services/api';
import { FinancialOverviewMetrics } from '../../types';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Layers,
  ArrowRight,
  CheckCircle2,
  FileText
} from 'lucide-react';

interface FinancialOverviewPageProps {
  onNavigateTab: (tab: string, filter?: any) => void;
  onAddToast: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;
}

export function FinancialOverviewPage({
  onNavigateTab,
  onAddToast
}: FinancialOverviewPageProps) {
  const [metrics, setMetrics] = useState<FinancialOverviewMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const data = await api.financial.getOverview();
      setMetrics(data);
    } catch (err: any) {
      onAddToast('error', 'Erro ao carregar visão geral financeira: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (loading || !metrics) {
    return <LoadingState label="Carregando métricas financeiras..." />;
  }

  return (
    <div className="space-y-6">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <DollarSign size={20} className="text-[#0a8900]" />
            Visão Geral Financeira
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Métricas consolidadas de faturamento, liquidações e despesas operacionais dos eventos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onNavigateTab('fin-cash-flow')}
            leftIcon={<TrendingUp size={14} />}
          >
            Fluxo de Caixa
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onNavigateTab('fin-receivables')}
            leftIcon={<ArrowUpRight size={14} />}
          >
            Contas a Receber
          </Button>
        </div>
      </div>

      {/* 2. Top Metric Cards Grid: Realizado vs Previsto */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card: Total Recebido (Realizado) */}
        <div
          onClick={() => onNavigateTab('fin-receivables', { status: 'paid' })}
          className="p-5 rounded-2xl bg-white border border-emerald-200/90 shadow-xs hover:border-emerald-400 hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Recebido (Realizado)
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition">
              <ArrowUpRight size={18} />
            </div>
          </div>
          <div className="mt-3 font-mono text-2xl font-extrabold text-emerald-800">
            {formatCurrency(metrics.totalReceivableReceived)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Previsto total: {formatCurrency(metrics.totalReceivableExpected)}</span>
            <span className="text-emerald-700 font-bold">Ver &rarr;</span>
          </div>
        </div>

        {/* Card: Total a Receber (Pendente) */}
        <div
          onClick={() => onNavigateTab('fin-receivables', { status: 'pending' })}
          className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-slate-400 hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total a Receber (Pendente)
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center group-hover:scale-110 transition">
              <Clock size={18} />
            </div>
          </div>
          <div className="mt-3 font-mono text-2xl font-extrabold text-slate-900">
            {formatCurrency(metrics.totalReceivablePending)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 flex items-center justify-between">
            <span>A vencer nos contratos ativos</span>
            <span className="text-blue-700 font-bold">Ver &rarr;</span>
          </div>
        </div>

        {/* Card: Total Pago (Despesas Realizadas) */}
        <div
          onClick={() => onNavigateTab('fin-payables', { status: 'paid' })}
          className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-slate-400 hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Pago (Despesas)
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center group-hover:scale-110 transition">
              <ArrowDownRight size={18} />
            </div>
          </div>
          <div className="mt-3 font-mono text-2xl font-extrabold text-slate-900">
            {formatCurrency(metrics.totalPayablePaid)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Previsto total: {formatCurrency(metrics.totalPayableExpected)}</span>
            <span className="text-amber-700 font-bold">Ver &rarr;</span>
          </div>
        </div>

        {/* Card: Saldo Operacional Realizado (Recebido - Pago) */}
        <div
          onClick={() => onNavigateTab('fin-cash-flow', { viewType: 'realizado' })}
          className={`p-5 rounded-2xl bg-white border shadow-xs transition cursor-pointer group ${
            metrics.operationalBalanceRealized >= 0
              ? 'border-emerald-300 hover:border-emerald-500'
              : 'border-rose-300 hover:border-rose-500'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Saldo Operacional Realizado
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center group-hover:scale-110 transition ${
              metrics.operationalBalanceRealized >= 0 ? 'bg-[#efffed] text-[#0a8900]' : 'bg-rose-50 text-rose-700'
            }`}>
              <DollarSign size={18} />
            </div>
          </div>
          <div className={`mt-3 font-mono text-2xl font-extrabold ${
            metrics.operationalBalanceRealized >= 0 ? 'text-emerald-800' : 'text-rose-600'
          }`}>
            {formatCurrency(metrics.operationalBalanceRealized)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Resultado Previsto: {formatCurrency(metrics.operationalBalanceExpected)}</span>
            <span className="font-bold text-slate-700">Fluxo &rarr;</span>
          </div>
        </div>
      </div>

      {/* 3. Secondary Alerts & Widgets Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Vencidos Card */}
        <div
          onClick={() => onNavigateTab('fin-receivables', { status: 'overdue' })}
          className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 text-rose-900 cursor-pointer hover:bg-rose-50 transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wide flex items-center gap-1.5">
              <AlertCircle size={15} className="text-rose-600" />
              Contas Vencidas
            </span>
            <span className="text-xs font-mono font-extrabold text-rose-800">
              {formatCurrency(metrics.totalReceivableOverdue)}
            </span>
          </div>
          <p className="text-[11px] text-rose-700 mt-1">
            Parcelas com vencimento anterior à data de hoje pendentes de quitação.
          </p>
        </div>

        {/* Vencimentos 7 Dias */}
        <div
          onClick={() => onNavigateTab('fin-receivables', { period: '7days' })}
          className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-900 cursor-pointer hover:bg-amber-50 transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wide flex items-center gap-1.5">
              <Calendar size={15} className="text-amber-600" />
              Próximos 7 Dias
            </span>
            <span className="text-xs font-mono font-extrabold text-amber-800">
              {formatCurrency(metrics.next7DaysDueAmount)}
            </span>
          </div>
          <p className="text-[11px] text-amber-700 mt-1">
            Contas a receber com vencimento agendado na semana atual.
          </p>
        </div>

        {/* Movimentações de Hoje */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wide">
              Movimentações de Hoje
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-200 font-bold">
              {metrics.todayReceiptsCount + metrics.todayPaymentsCount} ops
            </span>
          </div>
          <div className="mt-2 text-xs flex justify-between">
            <span className="text-emerald-700 font-medium">Entradas: {formatCurrency(metrics.todayReceiptsAmount)}</span>
            <span className="text-slate-600 font-medium">Saídas: {formatCurrency(metrics.todayPaymentsAmount)}</span>
          </div>
        </div>

        {/* Eventos com Atenção / Prejuízo */}
        <div
          onClick={() => onNavigateTab('fin-events')}
          className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-slate-400 text-slate-800 cursor-pointer transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wide flex items-center gap-1.5">
              <Layers size={15} className="text-emerald-700" />
              Resultado por Evento
            </span>
            {metrics.negativeEventsCount > 0 ? (
              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                {metrics.negativeEventsCount} com prejuízo
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                Todos positivos
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Consulte receitas, despesas e margens detalhadas de cada evento.
          </p>
        </div>
      </div>

      {/* 4. Recent Movements Table */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Movimentações Financeiras Recentes
            </h3>
            <p className="text-xs text-slate-500">
              Últimos recebimentos e pagamentos confirmados no caixa operacional.
            </p>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigateTab('fin-cash-flow')}
            rightIcon={<ArrowRight size={14} />}
          >
            Ver Fluxo Completo
          </Button>
        </div>

        {metrics.recentMovements.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            Nenhuma movimentação financeira confirmada até o momento.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Data</th>
                  <th className="py-2.5 px-3">Tipo</th>
                  <th className="py-2.5 px-3">Cliente / Fornecedor</th>
                  <th className="py-2.5 px-3">Evento / Descrição</th>
                  <th className="py-2.5 px-3 text-right">Valor</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {metrics.recentMovements.map((mov) => {
                  const isEntrada = mov.type === 'entrada';
                  return (
                    <tr key={mov.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-3 text-slate-500 font-mono">
                        {formatDate(mov.date)}
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
                        {mov.partyName}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {mov.description}
                      </td>
                      <td className={`py-3 px-3 text-right font-mono font-extrabold ${
                        isEntrada ? 'text-emerald-700' : 'text-slate-900'
                      }`}>
                        {isEntrada ? '+' : '-'} {formatCurrency(mov.amount)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200/60">
                          {mov.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
