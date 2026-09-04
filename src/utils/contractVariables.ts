import { formatCurrency, formatDate } from './formatters';

export interface ContractInterpolationContext {
  contractNumber: string;
  proposalNumber: string;
  client: {
    name?: string;
    tradeName?: string;
    document?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    contactPerson?: string;
    role?: string;
    email?: string;
    phone?: string;
  };
  contractor: {
    companyName?: string;
    tradeName?: string;
    cnpj?: string;
    address?: string;
    phone?: string;
    email?: string;
    legalRepresentative?: string;
    legalRepresentativeCpf?: string;
    legalRepresentativeRole?: string;
    defaultCourt?: string;
    defaultSignatureCity?: string;
  };
  event: {
    name?: string;
    startDate?: string;
    endDate?: string;
    location?: string;
    city?: string;
    state?: string;
    estimatedAttendees?: number;
  };
  financial: {
    finalAmount: number;
    subtotal: number;
    discountAmount: number;
    paymentMethod: string;
    paymentTerms: string;
  };
  items: Array<{
    serviceName: string;
    description?: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    discount?: number;
    total: number;
  }>;
  signature?: {
    date?: string;
    city?: string;
  };
}

export function buildVariableMap(ctx: ContractInterpolationContext): Record<string, string> {
  // Format client address
  const clientAddrParts = [
    ctx.client.address,
    ctx.client.city && ctx.client.state ? `${ctx.client.city} - ${ctx.client.state}` : (ctx.client.city || ctx.client.state),
    ctx.client.zipCode ? `CEP ${ctx.client.zipCode}` : null
  ].filter(Boolean);
  const clientAddress = clientAddrParts.join(', ') || 'Endereço não informado';

  // Format client representative
  const clientRep = ctx.client.contactPerson
    ? `${ctx.client.contactPerson}${ctx.client.role ? ` (${ctx.client.role})` : ''}`
    : 'Representante legal';

  // Format contractor representative
  const contractorRep = ctx.contractor.legalRepresentative
    ? `${ctx.contractor.legalRepresentative}${ctx.contractor.legalRepresentativeRole ? ` (${ctx.contractor.legalRepresentativeRole})` : ''}${ctx.contractor.legalRepresentativeCpf ? `, CPF nº ${ctx.contractor.legalRepresentativeCpf}` : ''}`
    : 'Representante legal Credencia';

  // Format event dates
  let eventDates = 'A definir';
  if (ctx.event.startDate) {
    eventDates = ctx.event.startDate === ctx.event.endDate || !ctx.event.endDate
      ? formatDate(ctx.event.startDate)
      : `${formatDate(ctx.event.startDate)} a ${formatDate(ctx.event.endDate)}`;
  }

  // Format event location
  const locParts = [
    ctx.event.location,
    ctx.event.city && ctx.event.state ? `${ctx.event.city}/${ctx.event.state}` : (ctx.event.city || ctx.event.state)
  ].filter(Boolean);
  const eventLocation = locParts.join(' - ') || 'Local a definir';

  // Format services items text
  const servicesText = (ctx.items || []).map((item, idx) => {
    const itemTotal = formatCurrency(item.total);
    const unitP = formatCurrency(item.unitPrice);
    const desc = item.description ? ` (${item.description})` : '';
    return `${idx + 1}. ${item.serviceName}${desc}: ${item.quantity} ${item.unit} x ${unitP} = ${itemTotal}`;
  }).join('\n');

  // Format signature date
  const sigDateFormatted = ctx.signature?.date ? formatDate(ctx.signature.date) : formatDate(new Date().toISOString());

  return {
    'NUMERO_CONTRATO': ctx.contractNumber || '',
    'NUMERO_PROPOSTA': ctx.proposalNumber || '',
    'CONTRATANTE_RAZAO_SOCIAL': ctx.client.name || ctx.client.tradeName || '',
    'CONTRATANTE_CNPJ': ctx.client.document || '',
    'CONTRATANTE_ENDERECO': clientAddress,
    'REPRESENTANTE_CONTRATANTE': clientRep,
    'CONTRATADA_RAZAO_SOCIAL': ctx.contractor.companyName || 'Credencia Tecnologia e Eventos Ltda',
    'CONTRATADA_CNPJ': ctx.contractor.cnpj || '38.921.450/0001-22',
    'CONTRATADA_ENDERECO': ctx.contractor.address || 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP',
    'REPRESENTANTE_CONTRATADA': contractorRep,
    'NOME_EVENTO': ctx.event.name || '',
    'DATA_EVENTO': eventDates,
    'LOCAL_EVENTO': eventLocation,
    'SERVICOS_CONTRATADOS': servicesText,
    'VALOR_CONTRATO': formatCurrency(ctx.financial.finalAmount),
    'CONDICAO_PAGAMENTO': `${ctx.financial.paymentMethod || 'Boleto bancário'} (${ctx.financial.paymentTerms || 'Faturamento em 30 dias'})`,
    'DATA_ASSINATURA': sigDateFormatted,
    'CIDADE_ASSINATURA': ctx.signature?.city || ctx.contractor.defaultSignatureCity || 'São Paulo - SP',
    'FORO': ctx.contractor.defaultCourt || 'Comarca de São Paulo / SP'
  };
}

/**
 * Replaces all {{VARIABLE}} placeholders in text with values from map.
 */
export function interpolateContractText(templateText: string, varMap: Record<string, string>): string {
  if (!templateText) return '';
  return templateText.replace(/\{\{([A-Z0-9_]+)\}\}/g, (match, key) => {
    if (Object.prototype.hasOwnProperty.call(varMap, key)) {
      const val = varMap[key];
      return val !== undefined && val !== null ? val : match;
    }
    return match;
  });
}

/**
 * Validates whether all mandatory variables in clauses are satisfied.
 * Returns a list of missing field descriptions, or empty array if ready.
 */
export function validateContractReady(ctx: ContractInterpolationContext, clauses: Array<{ content: string; title: string }>): string[] {
  const missing: string[] = [];
  const varMap = buildVariableMap(ctx);

  if (!ctx.contractNumber) missing.push('Número do Contrato');
  if (!ctx.proposalNumber) missing.push('Número da Proposta vinculada');
  if (!ctx.client.name && !ctx.client.tradeName) missing.push('Razão Social / Nome da Contratante');
  if (!ctx.client.document) missing.push('CNPJ/CPF da Contratante');
  if (!ctx.client.contactPerson) missing.push('Responsável da Contratante');
  if (!ctx.event.name) missing.push('Nome do Evento');
  if (!ctx.items || ctx.items.length === 0) missing.push('Ao menos 1 serviço contratado');
  if (!ctx.financial.finalAmount || ctx.financial.finalAmount <= 0) missing.push('Valor final do contrato válido');

  // Check if any clause has unfulfilled {{VAR}}
  for (const c of clauses) {
    const interpolated = interpolateContractText(c.content, varMap);
    const unresolved = interpolated.match(/\{\{([A-Z0-9_]+)\}\}/g);
    if (unresolved) {
      unresolved.forEach(u => {
        const clean = u.replace(/[{}]/g, '');
        const desc = `Variável pendente na ${c.title}: ${clean}`;
        if (!missing.includes(desc)) missing.push(desc);
      });
    }
  }

  return missing;
}
