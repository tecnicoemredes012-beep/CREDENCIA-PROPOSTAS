import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../utils/formatters';
import { api } from '../../services/api';
import {
  DollarSign,
  Calendar,
  CreditCard,
  Building2,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  FileText
} from 'lucide-react';

interface GenerateReceivableModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: any;
  onSuccess: (receivableId: string) => void;
  onAddToast: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;
}

interface InstallmentRow {
  installmentNumber: number;
  dueDate: string;
  amount: number;
  isEntry: boolean;
  identifier: string;
}

export function GenerateReceivableModal({
  isOpen,
  onClose,
  contract,
  onSuccess,
  onAddToast
}: GenerateReceivableModalProps) {
  const proposal = typeof contract?.proposalSnapshot === 'string'
    ? JSON.parse(contract.proposalSnapshot)
    : (contract?.proposalSnapshot || {});

  const totalContractAmount = Math.round((proposal.finalAmount || 0) * 100) / 100;

  const [paymentConditionType, setPaymentConditionType] = useState<'a_vista' | 'parcelado' | 'entrada_parcelas'>('a_vista');
  const [paymentMethod, setPaymentMethod] = useState<string>(proposal.paymentMethod || 'Boleto bancário');
  const [installmentsCount, setInstallmentsCount] = useState<number>(3);
  const [entryAmount, setEntryAmount] = useState<number>(0);
  const [entryDate, setEntryDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [firstDueDate, setFirstDueDate] = useState<string>(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
  const [intervalDays, setIntervalDays] = useState<number>(30);
  const [destinationAccountId, setDestinationAccountId] = useState<string>('acc-default-itau');
  const [notes, setNotes] = useState<string>(proposal.financialNotes || proposal.paymentTerms || '');

  const [accounts, setAccounts] = useState<any[]>([]);
  const [installmentsList, setInstallmentsList] = useState<InstallmentRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Load accounts
  useEffect(() => {
    if (isOpen) {
      api.financial.getAccounts().then(accs => {
        setAccounts(accs);
        const def = accs.find(a => a.isDefault);
        if (def) setDestinationAccountId(def.id);
      }).catch(() => {});
    }
  }, [isOpen]);

  // Recalculate preview installments whenever inputs change
  useEffect(() => {
    if (!isOpen || totalContractAmount <= 0) return;

    const rows: InstallmentRow[] = [];

    if (paymentConditionType === 'a_vista') {
      rows.push({
        installmentNumber: 1,
        dueDate: firstDueDate,
        amount: totalContractAmount,
        isEntry: false,
        identifier: `${contract.number}-P01/01`
      });
    } else if (paymentConditionType === 'entrada_parcelas') {
      const entry = Math.max(0, Math.min(totalContractAmount, Math.round((Number(entryAmount) || 0) * 100) / 100));
      const totalParcelas = installmentsCount + 1;

      // 1. Entrada
      rows.push({
        installmentNumber: 1,
        dueDate: entryDate,
        amount: entry,
        isEntry: true,
        identifier: `${contract.number}-ENTRADA`
      });

      // 2. Parcelas
      const remainingCents = Math.round((totalContractAmount - entry) * 100);
      const count = Math.max(1, installmentsCount);
      const baseCents = Math.floor(remainingCents / count);
      let accumulated = 0;

      for (let i = 1; i <= count; i++) {
        const isLast = i === count;
        const currentCents = isLast ? (remainingCents - accumulated) : baseCents;
        accumulated += currentCents;

        const baseDate = new Date(firstDueDate + 'T00:00:00');
        baseDate.setMonth(baseDate.getMonth() + (i - 1));
        const dateStr = baseDate.toISOString().split('T')[0];

        rows.push({
          installmentNumber: i + 1,
          dueDate: dateStr,
          amount: currentCents / 100,
          isEntry: false,
          identifier: `${contract.number}-P${String(i + 1).padStart(2, '0')}/${String(totalParcelas).padStart(2, '0')}`
        });
      }
    } else {
      // 'parcelado'
      const count = Math.max(1, installmentsCount);
      const totalCents = Math.round(totalContractAmount * 100);
      const baseCents = Math.floor(totalCents / count);
      let accumulated = 0;

      for (let i = 1; i <= count; i++) {
        const isLast = i === count;
        const currentCents = isLast ? (totalCents - accumulated) : baseCents;
        accumulated += currentCents;

        const baseDate = new Date(firstDueDate + 'T00:00:00');
        baseDate.setMonth(baseDate.getMonth() + (i - 1));
        const dateStr = baseDate.toISOString().split('T')[0];

        rows.push({
          installmentNumber: i,
          dueDate: dateStr,
          amount: currentCents / 100,
          isEntry: false,
          identifier: `${contract.number}-P${String(i).padStart(2, '0')}/${String(count).padStart(2, '0')}`
        });
      }
    }

    setInstallmentsList(rows);
  }, [
    isOpen,
    paymentConditionType,
    installmentsCount,
    entryAmount,
    entryDate,
    firstDueDate,
    totalContractAmount,
    contract?.number
  ]);

  // Total of installments list
  const currentSum = Math.round(installmentsList.reduce((acc, row) => acc + (Number(row.amount) || 0), 0) * 100) / 100;
  const difference = Math.round((currentSum - totalContractAmount) * 100) / 100;
  const hasDivergence = Math.abs(difference) > 0.009;

  const handleInstallmentAmountChange = (index: number, newAmount: number) => {
    setInstallmentsList(prev => {
      const next = [...prev];
      next[index] = { ...next[index], amount: Math.max(0, Math.round(newAmount * 100) / 100) };
      return next;
    });
  };

  const handleInstallmentDateChange = (index: number, newDate: string) => {
    setInstallmentsList(prev => {
      const next = [...prev];
      next[index] = { ...next[index], dueDate: newDate };
      return next;
    });
  };

  const handleConfirm = async () => {
    if (hasDivergence) {
      onAddToast('error', `A soma das parcelas (R$ ${currentSum.toFixed(2)}) diverge do valor do contrato (R$ ${totalContractAmount.toFixed(2)}). Corrija antes de confirmar.`);
      return;
    }

    for (let i = 0; i < installmentsList.length; i++) {
      if (!installmentsList[i].dueDate) {
        onAddToast('error', `A parcela ${installmentsList[i].identifier} está com data de vencimento vazia.`);
        return;
      }
      if (installmentsList[i].amount <= 0) {
        onAddToast('error', `A parcela ${installmentsList[i].identifier} possui valor menor ou igual a zero.`);
        return;
      }
    }

    try {
      setLoading(true);
      const res = await api.financial.generateFromContract(contract.id, {
        paymentConditionType,
        paymentMethod,
        paymentTerms: notes || proposal.paymentTerms,
        installmentsCount: paymentConditionType === 'a_vista' ? 1 : installmentsCount,
        entryAmount: paymentConditionType === 'entrada_parcelas' ? entryAmount : 0,
        entryDate,
        firstDueDate,
        intervalDays,
        destinationAccountId,
        notes,
        customInstallments: installmentsList,
        performedBy: 'Administrador'
      });

      onAddToast('success', `Financeiro gerado com sucesso! Lançamento: ${res.code}`);
      onSuccess(res.receivableId);
      onClose();
    } catch (err: any) {
      onAddToast('error', 'Erro ao gerar financeiro: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Gerar Financeiro do Contrato"
      maxWidth="xl"
    >
      <div className="space-y-6">
        {/* Header Summary Banner */}
        <div className="p-4 rounded-2xl border border-emerald-200/80 bg-emerald-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Contrato: {contract?.number} • Proposta: {contract?.proposalNumber}
            </div>
            <div className="text-sm font-semibold text-slate-900 mt-0.5">
              {contract?.eventSnapshot?.name || proposal?.eventName || 'Evento'}
            </div>
            <div className="text-xs text-slate-500">
              Cliente: {contract?.clientSnapshot?.name || contract?.clientSnapshot?.tradeName || 'Cliente'}
            </div>
          </div>

          <div className="text-left sm:text-right bg-white px-3.5 py-2 rounded-xl border border-emerald-200 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
              Valor Final Contratado
            </span>
            <span className="text-xl font-extrabold text-emerald-800 font-mono">
              {formatCurrency(totalContractAmount)}
            </span>
          </div>
        </div>

        {/* Configuration Form Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Tipo de Pagamento */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
              Condição de Pagamento
            </label>
            <select
              value={paymentConditionType}
              onChange={(e) => setPaymentConditionType(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-medium bg-white focus:outline-none focus:border-emerald-500"
            >
              <option value="a_vista">À vista</option>
              <option value="parcelado">Parcelado</option>
              <option value="entrada_parcelas">Entrada mais parcelas</option>
            </select>
          </div>

          {/* Forma de Pagamento */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
              Forma de Pagamento
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-medium bg-white focus:outline-none focus:border-emerald-500"
            >
              <option value="Boleto bancário">Boleto bancário</option>
              <option value="Pix">Pix</option>
              <option value="Transferência bancária">Transferência bancária</option>
              <option value="Cartão de crédito">Cartão de crédito</option>
              <option value="Cartão de débito">Cartão de débito</option>
              <option value="Dinheiro">Dinheiro</option>
              <option value="Outro">Outro</option>
            </select>
          </div>

          {/* Conta de Destino */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
              Conta de Recebimento
            </label>
            <select
              value={destinationAccountId}
              onChange={(e) => setDestinationAccountId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-medium bg-white focus:outline-none focus:border-emerald-500"
            >
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Dynamic Condition Details */}
        {paymentConditionType === 'entrada_parcelas' && (
          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Valor de Entrada (R$)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max={totalContractAmount}
                value={entryAmount || ''}
                onChange={(e) => setEntryAmount(parseFloat(e.target.value) || 0)}
                placeholder="Ex: 1095.00"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono font-bold bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Data da Entrada
              </label>
              <input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Quantidade de Parcelas (Saldo)
              </label>
              <input
                type="number"
                min="1"
                max="24"
                value={installmentsCount}
                onChange={(e) => setInstallmentsCount(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold bg-white"
              />
            </div>
          </div>
        )}

        {paymentConditionType === 'parcelado' && (
          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Quantidade de Parcelas
              </label>
              <input
                type="number"
                min="2"
                max="36"
                value={installmentsCount}
                onChange={(e) => setInstallmentsCount(parseInt(e.target.value, 10) || 2)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Data do 1º Vencimento
              </label>
              <input
                type="date"
                value={firstDueDate}
                onChange={(e) => setFirstDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
              />
            </div>
          </div>
        )}

        {paymentConditionType === 'a_vista' && (
          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Data de Vencimento
              </label>
              <input
                type="date"
                value={firstDueDate}
                onChange={(e) => setFirstDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
              />
            </div>
          </div>
        )}

        {/* Installment Simulation & Interactive Edit Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar size={14} className="text-emerald-600" />
              Cronograma de Parcelas Geradas ({installmentsList.length})
            </span>
            <span className="text-[11px] text-slate-500">
              * Centavos são corrigidos automaticamente na última parcela.
            </span>
          </div>

          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Parcela</th>
                  <th className="py-2.5 px-3">Tipo</th>
                  <th className="py-2.5 px-3">Data de Vencimento</th>
                  <th className="py-2.5 px-3 text-right">Valor (R$)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {installmentsList.map((inst, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60 transition">
                    <td className="py-2 px-3 font-mono font-bold text-slate-800">
                      {inst.identifier}
                    </td>
                    <td className="py-2 px-3">
                      {inst.isEntry ? (
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-[10px]">
                          Entrada
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold text-[10px]">
                          Parcela
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="date"
                        value={inst.dueDate}
                        onChange={(e) => handleInstallmentDateChange(idx, e.target.value)}
                        className="px-2 py-1 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:border-emerald-500"
                      />
                    </td>
                    <td className="py-2 px-3 text-right">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={inst.amount}
                        onChange={(e) => handleInstallmentAmountChange(idx, parseFloat(e.target.value) || 0)}
                        className="w-28 text-right px-2 py-1 rounded-lg border border-slate-200 text-xs font-mono font-bold bg-white focus:outline-none focus:border-emerald-500"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 font-bold text-xs border-t border-slate-200">
                <tr>
                  <td colSpan={3} className="py-2.5 px-3 text-right text-slate-700">
                    Soma das Parcelas:
                  </td>
                  <td className={`py-2.5 px-3 text-right font-mono text-sm ${
                    hasDivergence ? 'text-rose-600 bg-rose-50' : 'text-emerald-800'
                  }`}>
                    {formatCurrency(currentSum)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Divergence Warning */}
          {hasDivergence && (
            <div className="p-3 rounded-xl border border-rose-300 bg-rose-50 text-rose-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="text-rose-600 shrink-0" />
                <span>
                  <strong>Atenção:</strong> A soma das parcelas difere do contrato em{' '}
                  <strong>{formatCurrency(Math.abs(difference))}</strong> ({difference > 0 ? 'a maior' : 'a menor'}).
                </span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  // Auto-adjust difference on the last installment
                  const lastIdx = installmentsList.length - 1;
                  const curVal = installmentsList[lastIdx].amount;
                  handleInstallmentAmountChange(lastIdx, Math.round((curVal - difference) * 100) / 100);
                }}
              >
                Ajustar na Última Parcela
              </Button>
            </div>
          )}
        </div>

        {/* Observações */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
            Observações Financeiras (Opcional)
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Instruções de faturamento ou detalhes de pagamento..."
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={hasDivergence || loading}
            leftIcon={<CheckCircle2 size={16} />}
          >
            Confirmar e Gerar Financeiro
          </Button>
        </div>
      </div>
    </Modal>
  );
}
