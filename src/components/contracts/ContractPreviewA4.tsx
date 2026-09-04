import React from 'react';
import { Contract, ContractClause } from '../../types/contract';
import { buildVariableMap, interpolateContractText, ContractInterpolationContext } from '../../utils/contractVariables';
import { formatCurrency, formatDate } from '../../utils/formatters';
import credenciaLogo from '../../assets/credencia-logo.png';

interface ContractPreviewA4Props {
  contract: Contract;
  clauses?: ContractClause[];
  settings?: any;
}

export function ContractPreviewA4({ contract, clauses = [], settings }: ContractPreviewA4Props) {
  const client = typeof contract.clientSnapshot === 'string' ? JSON.parse(contract.clientSnapshot) : (contract.clientSnapshot || {});
  const contractor = typeof contract.contractorSnapshot === 'string' ? JSON.parse(contract.contractorSnapshot) : (contract.contractorSnapshot || settings || {});
  const event = typeof contract.eventSnapshot === 'string' ? JSON.parse(contract.eventSnapshot) : (contract.eventSnapshot || {});
  const proposal = typeof contract.proposalSnapshot === 'string' ? JSON.parse(contract.proposalSnapshot) : (contract.proposalSnapshot || {});
  const items = typeof contract.servicesSnapshot === 'string' ? JSON.parse(contract.servicesSnapshot) : (contract.servicesSnapshot || []);

  const interpContext: ContractInterpolationContext = {
    contractNumber: contract.number,
    proposalNumber: contract.proposalNumber,
    client,
    contractor,
    event,
    financial: {
      finalAmount: proposal.finalAmount || 0,
      subtotal: proposal.subtotal || 0,
      discountAmount: proposal.discountAmount || 0,
      paymentMethod: proposal.paymentMethod || 'Boleto bancário',
      paymentTerms: proposal.paymentTerms || 'Faturamento em 30 dias'
    },
    items,
    signature: {
      date: contract.signatureDate,
      city: contract.signatureCity
    }
  };

  const varMap = buildVariableMap(interpContext);
  const activeClauses = (clauses && clauses.length > 0 ? clauses : (contract.clauses || [])).filter(c => c.isActive !== false);

  return (
    <div className="mx-auto my-4 w-full max-w-[860px] bg-white text-slate-900 shadow-2xl rounded-2xl p-8 sm:p-14 print-page print:rounded-none print:shadow-none print:p-0 print:my-0 border border-slate-200/70 print:border-none text-xs leading-relaxed">
      {/* 1. Header with Logo, Document Title and Number */}
      <div className="relative pb-5 mb-6 border-b border-slate-200">
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
                Contratos de Prestação de Serviços
              </span>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 block">
              Instrumento Contratual
            </span>
            <span className="font-mono text-xl font-extrabold text-slate-900 block leading-tight">
              {contract.number}
            </span>
            <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">
              Proposta: <strong className="text-slate-700">{contract.proposalNumber}</strong> • Versão {contract.currentVersion} • Emissão: {formatDate(contract.createdAt)}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Banner Title */}
      <div className="mb-8 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
        <h3 className="font-extrabold text-sm sm:text-base text-emerald-950 uppercase tracking-wide">
          {contract.title || 'Contrato de Prestação de Serviços de Credenciamento'}
        </h3>
        <span className="text-[10px] text-slate-500 block mt-0.5">
          Vinculado integralmente à Proposta Comercial nº {contract.proposalNumber}
        </span>
      </div>

      {/* 3. Numbered Clauses */}
      <div className="space-y-6 text-slate-800">
        {activeClauses.map((clause) => {
          const content = interpolateContractText(clause.content, varMap);

          return (
            <div key={clause.id || clause.clauseNumber} className="space-y-2">
              <h4 className="font-bold text-xs uppercase tracking-wide text-emerald-900 border-b border-slate-100 pb-1 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#12e000] inline-block shrink-0" />
                {clause.title}
              </h4>

              {/* If Clause 3 (Services), render detailed services table */}
              {clause.clauseNumber === 3 && items.length > 0 ? (
                <div className="space-y-2">
                  <div className="overflow-hidden rounded-xl border border-slate-200 print:overflow-visible my-3">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-900 text-white font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-2 px-3 w-8 text-center">#</th>
                          <th className="py-2 px-3">Serviço & Especificação</th>
                          <th className="py-2 px-3 w-16 text-center">Qtd</th>
                          <th className="py-2 px-3 w-16 text-center">Unid.</th>
                          <th className="py-2 px-3 w-24 text-right">Valor Unit.</th>
                          <th className="py-2 px-3 w-24 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {items.map((it: any, idx: number) => (
                          <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'}>
                            <td className="py-2 px-3 font-mono text-slate-400 text-center font-bold">
                              {String(idx + 1).padStart(2, '0')}
                            </td>
                            <td className="py-2 px-3">
                              <span className="font-bold text-slate-900">{it.serviceName}</span>
                              {it.description && (
                                <p className="text-[11px] text-slate-500 mt-0.5">{it.description}</p>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center font-semibold text-slate-700">
                              {Number(it.quantity).toLocaleString('pt-BR')}
                            </td>
                            <td className="py-2 px-3 text-center text-slate-500">{it.unit}</td>
                            <td className="py-2 px-3 text-right font-mono text-slate-700">
                              {formatCurrency(it.unitPrice)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                              {formatCurrency(it.total)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <p className="text-[11px] text-slate-500 italic">
                    Parágrafo Único: Quaisquer serviços, licenças ou recursos adicionais não expressamente relacionados neste escopo serão objeto de aprovação prévia e orçamento complementar por meio de termo aditivo.
                  </p>
                </div>
              ) : (
                <div className="text-slate-700 leading-relaxed whitespace-pre-line text-justify text-xs pl-3 border-l-2 border-slate-100">
                  {content}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 4. Formal Signatures Block */}
      <div className="mt-12 pt-8 border-t-2 border-slate-200 break-inside-avoid">
        <div className="text-center mb-8">
          <p className="text-xs text-slate-600">
            {varMap['CIDADE_ASSINATURA']}, {varMap['DATA_ASSINATURA']}.
          </p>
        </div>

        {/* Primary Parties Signatures */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 mb-10">
          <div className="text-center">
            <div className="border-t border-slate-400 pt-2">
              <span className="font-bold text-slate-900 block text-xs">
                {varMap['CONTRATANTE_RAZAO_SOCIAL']}
              </span>
              <span className="text-[11px] text-slate-600 block">
                CONTRATANTE
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Representante: {client.contactPerson || 'Representante Legal'} {client.role ? `(${client.role})` : ''}
              </span>
              <span className="text-[10px] text-slate-400 block font-mono">
                CNPJ/CPF: {varMap['CONTRATANTE_CNPJ']}
              </span>
            </div>
          </div>

          <div className="text-center">
            <div className="border-t border-slate-400 pt-2">
              <span className="font-bold text-slate-900 block text-xs">
                {varMap['CONTRATADA_RAZAO_SOCIAL']}
              </span>
              <span className="text-[11px] text-slate-600 block">
                CONTRATADA (CREDENCIA)
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Representante: {contractor.legalRepresentative || 'Fernando Santos'} ({contractor.legalRepresentativeRole || 'Diretor Comercial'})
              </span>
              <span className="text-[10px] text-slate-400 block font-mono">
                CNPJ: {varMap['CONTRATADA_CNPJ']}
              </span>
            </div>
          </div>
        </div>

        {/* Two Witnesses Block */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 pt-4 border-t border-dashed border-slate-200">
          <div>
            <div className="border-t border-slate-300 pt-2 text-center sm:text-left">
              <span className="text-[11px] font-medium text-slate-600 block">Testemunha 1:</span>
              <span className="text-[10px] text-slate-400 block mt-1">Nome: _____________________________________</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">CPF: ___________________</span>
            </div>
          </div>

          <div>
            <div className="border-t border-slate-300 pt-2 text-center sm:text-left">
              <span className="text-[11px] font-medium text-slate-600 block">Testemunha 2:</span>
              <span className="text-[10px] text-slate-400 block mt-1">Nome: _____________________________________</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">CPF: ___________________</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Document Footer */}
      <div className="mt-12 pt-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center text-[10px] text-slate-400">
        <span>{contract.number} • Proposta {contract.proposalNumber} • Versão {contract.currentVersion}</span>
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
      </div>
    </div>
  );
}
