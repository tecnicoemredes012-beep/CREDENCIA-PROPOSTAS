import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/Button';
import { LoadingState } from '../../components/ui/Loading';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { api } from '../../services/api';
import {
  FileText,
  Download,
  Printer,
  Filter,
  FileSpreadsheet,
  Table,
  CheckCircle2,
  Calendar
} from 'lucide-react';

interface FinancialReportsPageProps {
  onAddToast: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;
}

export function FinancialReportsPage({ onAddToast }: FinancialReportsPageProps) {
  const [reportType, setReportType] = useState<string>('receivables');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const reportTitles: { [key: string]: string } = {
    receivables: 'Relatório de Contas a Receber',
    payables: 'Relatório de Contas a Pagar / Despesas',
    overdue: 'Relatório de Inadimplência e Contas Vencidas',
    general: 'Relatório Geral Consolidado'
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      const q = new URLSearchParams();
      q.set('reportType', reportType);
      if (startDate) q.set('startDate', startDate);
      if (endDate) q.set('endDate', endDate);
      const res = await fetch(`/api/financial/reports/export?${q.toString()}`);
      if (!res.ok) throw new Error('Erro ao gerar relatório');
      const data = await res.json();
      setReportData(data);
    } catch (err: any) {
      onAddToast('error', 'Erro ao carregar relatório: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportType]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    const q = new URLSearchParams();
    q.set('reportType', reportType);
    q.set('format', 'csv');
    if (startDate) q.set('startDate', startDate);
    if (endDate) q.set('endDate', endDate);
    window.open(`/api/financial/reports/export?${q.toString()}`, '_blank');
    onAddToast('success', 'Download do arquivo CSV iniciado.');
  };

  const columns = reportData.length > 0 ? Object.keys(reportData[0]) : [];

  return (
    <div className="space-y-6">
      {/* 1. Header Toolbar (Hidden during print) */}
      <div className="no-print flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText size={20} className="text-emerald-700" />
            Relatórios Financeiros Operacionais
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Emissão, conferência e exportação de relatórios tabulares para Excel, CSV e impressão/PDF.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCsv}
            leftIcon={<FileSpreadsheet size={14} className="text-emerald-700" />}
          >
            Exportar CSV / Excel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handlePrint}
            leftIcon={<Printer size={14} />}
          >
            Imprimir / Salvar PDF
          </Button>
        </div>
      </div>

      {/* 2. Parameters & Filter Bar */}
      <div className="no-print p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Tipo de Relatório
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-white focus:outline-none focus:border-emerald-500"
            >
              <option value="receivables">Contas a Receber</option>
              <option value="payables">Contas a Pagar</option>
              <option value="overdue">Valores Vencidos / Inadimplentes</option>
              <option value="general">Geral Consolidado</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Data Inicial
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Data Final
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-100">
          <Button variant="secondary" size="sm" onClick={fetchReport}>
            Atualizar Relatório
          </Button>
        </div>
      </div>

      {/* 3. Printable Report Document */}
      <div className="p-6 sm:p-8 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4 print:p-0 print:border-none print:shadow-none">
        {/* Printable Title Bar */}
        <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              {reportTitles[reportType] || 'Relatório Financeiro'}
            </h3>
            <span className="text-xs text-slate-500">
              Credencia Tecnologia em Eventos • Emissão: {formatDate(new Date().toISOString().split('T')[0])}
            </span>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
            {reportData.length} registros
          </span>
        </div>

        {/* Data Grid Table */}
        {loading ? (
          <LoadingState label="Processando dados do relatório..." />
        ) : reportData.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            Nenhum registro encontrado para os filtros selecionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                <tr>
                  {columns.map(col => (
                    <th key={col} className="py-2.5 px-3">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {reportData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70">
                    {columns.map(col => {
                      const val = row[col];
                      const isMoney = typeof val === 'number' && (col.toLowerCase().includes('valor') || col.toLowerCase().includes('saldo') || col.toLowerCase().includes('montante'));
                      return (
                        <td key={col} className={`py-2 px-3 ${isMoney ? 'font-mono text-right' : ''}`}>
                          {isMoney ? formatCurrency(val) : String(val ?? '-')}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
