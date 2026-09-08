import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ReversalModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetRecord: {
    id: string;
    description: string;
    amount: number;
    date: string;
    code?: string;
  } | null;
  onConfirm: (reason: string) => Promise<void>;
  loading?: boolean;
}

export function ReversalModal({
  isOpen,
  onClose,
  targetRecord,
  onConfirm,
  loading = false
}: ReversalModalProps) {
  const [reason, setReason] = useState('');

  if (!targetRecord) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    await onConfirm(reason.trim());
    setReason('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirmar Estorno Financeiro"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/70 text-rose-900 flex items-start gap-3">
          <AlertTriangle size={20} className="text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <span className="font-bold block text-sm">Atenção: Ação de Estorno</span>
            <p>
              O estorno irá reverter a quitação e restaurar o saldo devedor da parcela.
              O registro original será mantido permanentemente no log de auditoria do sistema.
            </p>
          </div>
        </div>

        <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-500">Lançamento:</span>
            <span className="font-bold text-slate-800">{targetRecord.description}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Data da Operação:</span>
            <span className="font-medium text-slate-700">{formatDate(targetRecord.date)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Valor a ser Estornado:</span>
            <span className="font-extrabold text-rose-600 font-mono text-sm">
              {formatCurrency(targetRecord.amount)}
            </span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Motivo do Estorno <span className="text-rose-600">*</span>
          </label>
          <textarea
            required
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Descreva detalhadamente o motivo deste estorno (obrigatório para auditoria)..."
            className="w-full text-sm rounded-xl border border-slate-300 p-3 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="danger"
            disabled={!reason.trim() || loading}
            leftIcon={<RotateCcw size={15} />}
          >
            Confirmar Estorno
          </Button>
        </div>
      </form>
    </Modal>
  );
}
