import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Printer, Download, CheckCircle, FileText, ExternalLink } from 'lucide-react';
import credenciaLogoLockup from '../../assets/credencia-logo-lockup.png';

interface ReceiptViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiptDoc: any;
}

export function ReceiptViewModal({
  isOpen,
  onClose,
  receiptDoc
}: ReceiptViewModalProps) {
  if (!receiptDoc) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Recibo Oficial — ${receiptDoc.receiptNumber}`}
      maxWidth="lg"
    >
      <div className="space-y-6">
        {/* Printable Receipt Paper Container */}
        <div id="printable-receipt" className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6 text-slate-800">
          {/* Top Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
            <div className="flex items-center gap-3">
              <img src={credenciaLogoLockup} alt="Credencia" className="h-9 w-auto object-contain" />
              <div className="border-l border-slate-200 pl-3">
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800 block">
                  Comprovante Oficial de Quitação
                </span>
                <span className="text-xs text-slate-500">
                  Credencia Tecnologia e Eventos Ltda
                </span>
              </div>
            </div>

            <div className="text-left sm:text-right bg-emerald-50 px-3.5 py-1.5 rounded-xl border border-emerald-200">
              <span className="text-[10px] font-bold text-emerald-800 uppercase block tracking-wider">
                Recibo Nº
              </span>
              <span className="text-base font-extrabold font-mono text-slate-900">
                {receiptDoc.receiptNumber}
              </span>
            </div>
          </div>

          {/* Amount Box */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold uppercase text-slate-500 block">
                Valor Recebido
              </span>
              <span className="text-2xl font-extrabold font-mono text-emerald-800">
                {formatCurrency(receiptDoc.amount)}
              </span>
            </div>

            <div className="text-xs font-medium text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
              Forma de Pagamento: <strong>{receiptDoc.paymentMethod}</strong>
            </div>
          </div>

          {/* Body Statement */}
          <div className="text-xs leading-relaxed space-y-3 bg-white p-4 rounded-xl border border-slate-100">
            <p>
              Recebemos de <strong>{receiptDoc.clientName}</strong>
              {receiptDoc.clientDocument ? `, inscrito(a) no CNPJ/CPF sob o nº ${receiptDoc.clientDocument}` : ''},
              a quantia líquida de <strong>{formatCurrency(receiptDoc.amount)}</strong>{' '}
              <em className="font-semibold text-slate-700">({receiptDoc.amountInWords})</em>.
            </p>

            <p>
              Referente a: <strong>{receiptDoc.referenceDescription}</strong>
              {receiptDoc.installmentDescription ? ` — ${receiptDoc.installmentDescription}` : ''}
              {receiptDoc.eventName ? ` referente ao evento "${receiptDoc.eventName}"` : ''}
              {receiptDoc.contractNumber ? `, conforme Contrato nº ${receiptDoc.contractNumber}` : ''}
              {receiptDoc.proposalNumber ? ` e Proposta nº ${receiptDoc.proposalNumber}` : ''}.
            </p>

            <p className="text-slate-500 italic pt-1">
              Para maior clareza e firmeza das obrigações assumidas, firmamos o presente recibo dando plena e irrevogável quitação do valor supramencionado.
            </p>
          </div>

          {/* Date and Signature Line */}
          <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-end justify-between gap-6">
            <div className="text-xs text-slate-500">
              Data de Emissão: <strong>{formatDate(receiptDoc.receiptDate)}</strong>
            </div>

            <div className="text-center sm:text-right min-w-[200px]">
              <div className="border-b border-slate-400 w-48 mb-1.5 ml-auto" />
              <span className="text-xs font-bold text-slate-900 block">
                {receiptDoc.issuerName}
              </span>
              <span className="text-[11px] text-slate-500 block">
                {receiptDoc.issuerDocument ? `CNPJ: ${receiptDoc.issuerDocument}` : 'Credencia Tecnologia em Eventos'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Fechar
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={handlePrint}
              leftIcon={<Printer size={15} />}
            >
              Imprimir
            </Button>

            <a
              href={`/api/financial/receipts/document/${receiptDoc.id}/pdf`}
              download={`Recibo_${receiptDoc.receiptNumber}.pdf`}
              className="cx-button-primary inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer"
            >
              <Download size={15} />
              Baixar Recibo em PDF
            </a>
          </div>
        </div>
      </div>
    </Modal>
  );
}
