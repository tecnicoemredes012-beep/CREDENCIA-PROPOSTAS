import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { api } from '../../services/api';
import { CheckCircle2, DollarSign, Calendar, Upload, CreditCard } from 'lucide-react';

interface ReceiptPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'receipt' | 'payment'; // receipt = contas a receber, payment = contas a pagar
  installment: any;
  parentEntity: any; // Receivable or Payable
  onSuccess: () => void;
  onAddToast: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;
}

export function ReceiptPaymentModal({
  isOpen,
  onClose,
  mode,
  installment,
  parentEntity,
  onSuccess,
  onAddToast
}: ReceiptPaymentModalProps) {
  const isReceipt = mode === 'receipt';
  const balance = Math.round((installment?.balance || 0) * 100) / 100;

  const [amount, setAmount] = useState<number>(balance);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<string>(installment?.paymentMethod || 'Pix');
  const [accountId, setAccountId] = useState<string>('acc-default-itau');
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [proofDocumentName, setProofDocumentName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setAmount(balance);
      setDate(new Date().toISOString().split('T')[0]);
      setTransactionRef('');
      setProofDocumentName('');
      setNotes('');

      api.financial.getAccounts().then(accs => {
        setAccounts(accs);
        const def = accs.find(a => a.isDefault);
        if (def) setAccountId(def.id);
      }).catch(() => {});
    }
  }, [isOpen, balance]);

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = Math.round((Number(amount) || 0) * 100) / 100;

    if (val <= 0) {
      onAddToast('error', 'O valor deve ser maior que zero.');
      return;
    }

    if (val > balance) {
      if (!confirm(`O valor digitado (${formatCurrency(val)}) é maior que o saldo devedor (${formatCurrency(balance)}). Deseja confirmar como recebimento com crédito adicional?`)) {
        return;
      }
    }

    try {
      setLoading(true);
      if (isReceipt) {
        await api.financial.registerReceipt(parentEntity.id, installment.id, {
          amount: val,
          receivedDate: date,
          paymentMethod,
          destinationAccountId: accountId,
          transactionRef: transactionRef.trim(),
          proofDocumentName: proofDocumentName.trim(),
          notes: notes.trim(),
          forceOverpayment: val > balance,
          performedBy: 'Administrador'
        });
        onAddToast('success', val >= balance ? 'Parcela quitada com sucesso!' : 'Recebimento parcial registrado com sucesso.');
      } else {
        await api.financial.registerPayment(parentEntity.id, installment.id, {
          amount: val,
          paymentDate: date,
          paymentMethod,
          sourceAccountId: accountId,
          transactionRef: transactionRef.trim(),
          proofDocumentName: proofDocumentName.trim(),
          notes: notes.trim(),
          performedBy: 'Administrador'
        });
        onAddToast('success', val >= balance ? 'Despesa quitada com sucesso!' : 'Pagamento parcial registrado com sucesso.');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      onAddToast('error', 'Erro ao processar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isReceipt ? 'Registrar Recebimento' : 'Registrar Pagamento de Despesa'}
      maxWidth="md"
    >
      <form onSubmit={handleConfirm} className="space-y-4">
        {/* Info Banner */}
        <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
          isReceipt ? 'border-emerald-200 bg-emerald-50/50 text-emerald-950' : 'border-blue-200 bg-blue-50/50 text-blue-950'
        }`}>
          <div>
            <span className="font-bold block text-slate-800">
              {installment?.identifier} • {parentEntity?.eventName || parentEntity?.description}
            </span>
            <span className="text-slate-500 block">
              Vencimento: {formatDate(installment?.dueDate)}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">
              Saldo Pendente
            </span>
            <span className="text-base font-extrabold font-mono text-emerald-800">
              {formatCurrency(balance)}
            </span>
          </div>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Valor {isReceipt ? 'a Receber' : 'a Pagar'} (R$) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={amount || ''}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-base font-mono font-extrabold text-slate-900 bg-white focus:outline-none focus:border-emerald-500"
            />
            {amount < balance && amount > 0 && (
              <span className="text-[11px] text-amber-700 font-medium block mt-1">
                Recebimento parcial. Saldo restante: {formatCurrency(balance - amount)}.
              </span>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Data da Liquidação *
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Forma de Pagamento
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:border-emerald-500"
            >
              <option value="Pix">Pix</option>
              <option value="Boleto bancário">Boleto bancário</option>
              <option value="Transferência bancária">Transferência bancária</option>
              <option value="Cartão de crédito">Cartão de crédito</option>
              <option value="Cartão de débito">Cartão de débito</option>
              <option value="Dinheiro">Dinheiro</option>
              <option value="Outro">Outro</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              {isReceipt ? 'Conta de Destino' : 'Conta de Saída'}
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:border-emerald-500"
            >
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
            Identificação / Código da Transação (Opcional)
          </label>
          <input
            type="text"
            value={transactionRef}
            onChange={(e) => setTransactionRef(e.target.value)}
            placeholder="Ex: NSU 987123 / Aut. Pix E123..."
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono bg-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
            Comprovante / Anexo (Opcional)
          </label>
          <input
            type="text"
            value={proofDocumentName}
            onChange={(e) => setProofDocumentName(e.target.value)}
            placeholder="Ex: comprovante_pix_operacional.pdf"
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
            Observações
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anotações internas sobre esta movimentação..."
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={loading}
            leftIcon={<CheckCircle2 size={16} />}
          >
            {isReceipt ? 'Confirmar Recebimento' : 'Confirmar Pagamento'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
