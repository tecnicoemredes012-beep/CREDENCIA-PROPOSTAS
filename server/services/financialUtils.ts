import { db } from '../database';

/**
 * Utilitário para converter valores numéricos em moeda por extenso em Português do Brasil.
 */
export function valorPorExtenso(valor: number): string {
  const v = Math.abs(Number(valor) || 0);
  if (v === 0) return 'Zero reais';

  const inteira = Math.floor(v);
  const centavos = Math.round((v - inteira) * 100);

  const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
  const especiais = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

  function converterGrupo(n: number): string {
    if (n === 0) return '';
    if (n === 100) return 'cem';

    const c = Math.floor(n / 100);
    const d = Math.floor((n % 100) / 10);
    const u = n % 10;
    const partes: string[] = [];

    if (c > 0) partes.push(centenas[c]);

    if (d === 1) {
      partes.push(especiais[u]);
    } else {
      if (d > 1) partes.push(dezenas[d]);
      if (u > 0) partes.push(unidades[u]);
    }

    return partes.join(' e ');
  }

  const partesTexto: string[] = [];

  // Milhões
  const milhoes = Math.floor(inteira / 1000000);
  if (milhoes > 0) {
    partesTexto.push(converterGrupo(milhoes) + (milhoes === 1 ? ' milhão' : ' milhões'));
  }

  // Milhares
  const milhares = Math.floor((inteira % 1000000) / 1000);
  if (milhares > 0) {
    if (milhares === 1) {
      partesTexto.push('um mil');
    } else {
      partesTexto.push(converterGrupo(milhares) + ' mil');
    }
  }

  // Centenas/Dezenas/Unidades
  const resto = inteira % 1000;
  if (resto > 0) {
    partesTexto.push(converterGrupo(resto));
  }

  let resultado = '';
  if (inteira > 0) {
    resultado = partesTexto.join(' e ') + (inteira === 1 ? ' real' : ' reais');
  }

  if (centavos > 0) {
    const textoCentavos = converterGrupo(centavos) + (centavos === 1 ? ' centavo' : ' centavos');
    if (resultado) {
      resultado += ' e ' + textoCentavos;
    } else {
      resultado = textoCentavos;
    }
  }

  // Capitaliza a primeira letra
  return resultado.charAt(0).toUpperCase() + resultado.slice(1);
}

/**
 * Gera numeração sequencial anual para recibos oficiais (REC-AAAA-XXXX)
 */
export function generateNextReceiptDocNumber(year?: number): { number: string; sequence: number; year: number } {
  const currentYear = year || new Date().getFullYear();
  const settings: any = db.prepare("SELECT receiptPrefix FROM financial_settings WHERE id = 'default'").get()
    || { receiptPrefix: 'REC' };
  const prefix = settings.receiptPrefix || 'REC';

  const row = db.prepare(`
    SELECT MAX(sequenceNumber) as maxSeq
    FROM financial_receipt_documents
    WHERE year = ?
  `).get(currentYear) as { maxSeq: number | null };

  const nextSeq = (row?.maxSeq || 0) + 1;
  const seqStr = String(nextSeq).padStart(4, '0');
  const number = `${prefix}-${currentYear}-${seqStr}`;

  return { number, sequence: nextSeq, year: currentYear };
}

/**
 * Gera numeração sequencial anual para contas a receber
 */
export function generateNextReceivableCode(year?: number): { code: string; sequence: number; year: number } {
  const currentYear = year || new Date().getFullYear();
  const row = db.prepare(`
    SELECT MAX(sequenceNumber) as maxSeq
    FROM financial_receivables
    WHERE year = ?
  `).get(currentYear) as { maxSeq: number | null };

  const nextSeq = (row?.maxSeq || 0) + 1;
  const seqStr = String(nextSeq).padStart(4, '0');
  const code = `REC-FIN-${currentYear}-${seqStr}`;

  return { code, sequence: nextSeq, year: currentYear };
}

/**
 * Gera numeração sequencial anual para contas a pagar / despesas
 */
export function generateNextPayableCode(year?: number): { code: string; sequence: number; year: number } {
  const currentYear = year || new Date().getFullYear();
  const row = db.prepare(`
    SELECT MAX(sequenceNumber) as maxSeq
    FROM financial_payables
    WHERE year = ?
  `).get(currentYear) as { maxSeq: number | null };

  const nextSeq = (row?.maxSeq || 0) + 1;
  const seqStr = String(nextSeq).padStart(4, '0');
  const code = `DESP-${currentYear}-${seqStr}`;

  return { code, sequence: nextSeq, year: currentYear };
}
