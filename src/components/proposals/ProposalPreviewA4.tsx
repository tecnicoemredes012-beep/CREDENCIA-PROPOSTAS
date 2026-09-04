import React from 'react';
import { Proposal, SystemSettings, Client } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import credenciaLogo from '../../assets/credencia-logo.png';

interface ProposalPreviewA4Props {
  proposal: Proposal;
  settings?: SystemSettings | null;
}

export function ProposalPreviewA4({ proposal, settings }: ProposalPreviewA4Props) {
  const client: Partial<Client> = proposal.clientSnapshot || {};

  return (
    <div className="mx-auto my-4 w-full max-w-[840px] bg-white text-slate-900 shadow-2xl rounded-2xl p-8 sm:p-12 print-page print:rounded-none print:shadow-none print:p-0 print:my-0 border border-slate-200/60 print:border-none">
      {/* 1. Header with Logo, Title and Number */}
      <div className="relative pb-5 mb-5 border-b border-slate-200">
        <div className="h-1.5 w-full bg-[#12e000] rounded-full mb-5" />

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <img
              src={credenciaLogo}
              alt="Credencia"
              className="h-12 w-auto object-contain"
            />
            <div className="hidden sm:block border-l border-slate-200 pl-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-800 block">
                Tecnologia em Eventos
              </span>
              <span className="text-[9px] text-slate-400 font-medium">
                Credenciamento • Controle de Acesso
              </span>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 block">
              Proposta Comercial
            </span>
            <span className="font-mono text-xl font-extrabold text-slate-900 block leading-tight">
              {proposal.number}
            </span>
            <span className="text-xs text-slate-500 font-medium mt-0.5 block">
              Emissão: {formatDate(proposal.issueDate)} • Validade: {formatDate(proposal.dueDate)}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Client & Event Info Boxes (Two Columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {/* Client Box */}
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-800 block mb-1.5">
            Dados do Cliente
          </span>
          <h4 className="text-sm font-extrabold text-slate-900 leading-snug">
            {client.name || 'Cliente não informado'}
          </h4>
          {client.tradeName && (
            <p className="text-xs text-slate-500 font-medium">
              Nome Fantasia: {client.tradeName}
            </p>
          )}
          <p className="text-xs text-slate-600 font-mono mt-1">
            CNPJ/CPF: {client.document || '-'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Responsável: <strong className="text-slate-700">{client.contactPerson || '-'}</strong> {client.role ? `(${client.role})` : ''}
          </p>
          <p className="text-xs text-slate-500">
            {client.email} {client.phone ? `• ${client.phone}` : ''}
          </p>
        </div>

        {/* Event Box */}
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-800 block mb-1.5">
            Dados do Evento
          </span>
          <h4 className="text-sm font-extrabold text-slate-900 leading-snug">
            {proposal.eventName || 'Evento'}
          </h4>
          {(proposal.eventStartDate || proposal.eventEndDate) && (
            <p className="text-xs text-slate-600 mt-0.5">
              Período: <strong className="text-slate-800">{formatDate(proposal.eventStartDate)}</strong> {proposal.eventEndDate ? `até ${formatDate(proposal.eventEndDate)}` : ''}
            </p>
          )}
          {proposal.eventLocation && (
            <p className="text-xs text-slate-500 mt-0.5">
              Local: {proposal.eventLocation}
            </p>
          )}
          {(proposal.eventCity || proposal.eventState) && (
            <p className="text-xs text-slate-500">
              Cidade/UF: {[proposal.eventCity, proposal.eventState].filter(Boolean).join(' - ')}
            </p>
          )}
          {proposal.estimatedAttendees && (
            <p className="text-xs text-slate-600 mt-0.5">
              Público estimado: <strong>{proposal.estimatedAttendees.toLocaleString('pt-BR')}</strong> participantes
            </p>
          )}
        </div>
      </div>

      {/* 3. Services Table */}
      <div className="mb-6 overflow-hidden print:overflow-visible rounded-xl border border-slate-200">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-900 text-white font-bold uppercase tracking-wider text-[10px]">
              <th className="py-2.5 px-3 w-10 text-center">#</th>
              <th className="py-2.5 px-3">Serviço & Especificação</th>
              <th className="py-2.5 px-3 w-16 text-center">Qtd</th>
              <th className="py-2.5 px-3 w-20 text-center">Unid.</th>
              <th className="py-2.5 px-3 w-24 text-right">Valor Unit.</th>
              <th className="py-2.5 px-3 w-20 text-right">Desc.</th>
              <th className="py-2.5 px-3 w-28 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {proposal.items.map((item, idx) => (
              <tr key={item.id || idx} className={idx % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'}>
                <td className="py-2.5 px-3 font-mono font-bold text-slate-400 text-center">
                  {String(idx + 1).padStart(2, '0')}
                </td>
                <td className="py-2.5 px-3">
                  <div className="font-bold text-slate-900 leading-snug">{item.serviceName}</div>
                  {item.description && (
                    <div className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                      {item.description}
                    </div>
                  )}
                </td>
                <td className="py-2.5 px-3 text-center font-semibold text-slate-700">
                  {Number(item.quantity).toLocaleString('pt-BR')}
                </td>
                <td className="py-2.5 px-3 text-center text-slate-500">
                  {item.unit}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                  {formatCurrency(item.unitPrice)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-rose-600">
                  {item.discount > 0 ? `- ${formatCurrency(item.discount)}` : '—'}
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-extrabold text-slate-900">
                  {formatCurrency(item.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 4. Financial Summary & Payment Box */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 mb-6">
        {/* Payment terms */}
        <div className="sm:col-span-7 p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-800 block mb-1">
              Condições Comerciais e Faturamento
            </span>
            <p className="text-xs font-bold text-slate-800">
              Forma de Pagamento: <span className="font-normal">{proposal.paymentMethod || 'Boleto bancário'}</span>
            </p>
            <p className="text-xs font-bold text-slate-800 mt-0.5">
              Condição: <span className="font-normal">{proposal.paymentTerms || 'Faturamento em 30 dias'}</span>
            </p>
            {proposal.financialNotes && (
              <p className="text-[11px] text-slate-600 mt-2 italic leading-relaxed">
                Nota: {proposal.financialNotes}
              </p>
            )}
          </div>
          <div className="mt-3 pt-2 border-t border-slate-200/60 text-[11px] text-slate-400">
            Responsável pela Proposta: <strong className="text-slate-600">{proposal.responsibleName}</strong>
          </div>
        </div>

        {/* Totals */}
        <div className="sm:col-span-5 p-4 rounded-xl border border-slate-200 bg-white space-y-2">
          <div className="flex justify-between text-xs text-slate-600">
            <span>Subtotal:</span>
            <span className="font-mono font-bold text-slate-900">{formatCurrency(proposal.subtotal)}</span>
          </div>

          {proposal.discountAmount > 0 && (
            <div className="flex justify-between text-xs text-rose-600">
              <span>Desconto {proposal.discountPercent > 0 ? `(${proposal.discountPercent}%)` : ''}:</span>
              <span className="font-mono font-bold">- {formatCurrency(proposal.discountAmount)}</span>
            </div>
          )}

          {proposal.additionalAmount > 0 && (
            <div className="flex justify-between text-xs text-slate-700">
              <span>Acréscimos / Ajustes:</span>
              <span className="font-mono font-bold">+ {formatCurrency(proposal.additionalAmount)}</span>
            </div>
          )}

          <div className="pt-2 border-t border-slate-200 flex items-center justify-between p-2.5 rounded-xl bg-[#12e000] text-slate-950 font-extrabold">
            <span className="text-xs uppercase tracking-wider">Valor Total:</span>
            <span className="font-mono text-base">{formatCurrency(proposal.finalAmount)}</span>
          </div>
        </div>
      </div>

      {/* 5. Scope / General Conditions */}
      {(proposal.termsAndConditions || settings?.generalConditions) && (
        <div className="mb-6 p-4 rounded-xl border border-slate-200 bg-slate-50/40 text-[11px] text-slate-600 leading-relaxed">
          <span className="font-bold text-[10px] uppercase tracking-[0.14em] text-emerald-800 block mb-1">
            Condições Gerais de Fornecimento
          </span>
          <div className="whitespace-pre-line text-slate-600">
            {proposal.termsAndConditions || settings?.generalConditions}
          </div>
        </div>
      )}

      {/* 6. Signature Acceptance Box */}
      <div className="pt-4 border-t border-slate-200">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 block mb-6">
          De Acordo e Aceite Formal da Proposta
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          <div className="text-center sm:text-left">
            <div className="border-t border-slate-300 pt-2 text-xs font-bold text-slate-800">
              {client.name || 'Contratante'}
            </div>
            <div className="text-[10px] text-slate-400">
              Assinatura do Responsável / Data
            </div>
          </div>

          <div className="text-center sm:text-right">
            <div className="border-t border-slate-300 pt-2 text-xs font-bold text-slate-800">
              {settings?.companyName || 'Credencia Tecnologia em Eventos'}
            </div>
            <div className="text-[10px] text-slate-400">
              {proposal.responsibleName || 'Departamento Comercial'}
            </div>
          </div>
        </div>
      </div>

      {/* 7. Footer */}
      <div className="mt-8 pt-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center text-[10px] text-slate-400">
        <span>
          {settings?.footerText?.trim() ||
            [
              settings?.companyName || 'Credencia Tecnologia em Eventos',
              settings?.cnpj ? `CNPJ ${settings.cnpj}` : null,
              settings?.email || null,
            ]
              .filter(Boolean)
              .join(' • ') || 'Credencia Tecnologia em Eventos'}
        </span>
        <span>Documento oficial de proposta comercial</span>
      </div>
    </div>
  );
}
