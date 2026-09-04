import fs from 'fs';
import path from 'path';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Proposal, SystemSettings } from '../../src/types';
import { formatCurrency, formatDate } from '../../src/utils/formatters';

type JsPdfWithAutoTable = jsPDF & {
  lastAutoTable?: { finalY: number };
};

const pageWidth = 210;
const pageHeight = 297;
const margin = 14;
const contentWidth = pageWidth - margin * 2;

// Colors matching Credencia design tokens
const darkGreenHex = '#073f12';
const graphiteHex = '#07100d';
const mutedHex = '#64748b';

function getLogoBase64(): string | null {
  try {
    const logoPath = path.resolve(process.cwd(), 'src/assets/credencia-logo.png');
    if (fs.existsSync(logoPath)) {
      const buffer = fs.readFileSync(logoPath);
      return `data:image/png;base64,${buffer.toString('base64')}`;
    }
  } catch (err) {
    console.warn('Erro ao carregar logotipo local:', err);
  }
  return null;
}

export function generateServerProposalPDF(proposal: Proposal, settings?: SystemSettings | null): { buffer: Buffer; fileName: string } {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  }) as JsPdfWithAutoTable;

  const logoDataUrl = getLogoBase64();
  let currentY = margin;

  // 1. HEADER SECTION
  doc.setFillColor(18, 224, 0);
  doc.rect(margin, currentY, contentWidth, 2, 'F');
  currentY += 5;

  // Draw Logo
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', margin, currentY, 44, 15, undefined, 'FAST');
    } catch {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(darkGreenHex);
      doc.text('CREDENCIA', margin, currentY + 10);
    }
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(darkGreenHex);
    doc.text('CREDENCIA', margin, currentY + 10);
  }

  // Proposal title and number (right side)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(graphiteHex);
  doc.text('PROPOSTA COMERCIAL', pageWidth - margin, currentY + 4, { align: 'right' });

  doc.setFont('courier', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(18, 160, 0);
  doc.text(proposal.number, pageWidth - margin, currentY + 10, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(mutedHex);
  doc.text(`Emissão: ${formatDate(proposal.issueDate)}  |  Validade: ${formatDate(proposal.dueDate)}`, pageWidth - margin, currentY + 15, { align: 'right' });

  currentY += 21;

  // Thin separator
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 5;

  // 2. CLIENT & EVENT DETAILS BOXES (Two Columns)
  const colWidth = (contentWidth - 6) / 2;
  const clientX = margin;
  const eventX = margin + colWidth + 6;
  const boxHeight = 44;

  // Client Box
  doc.setFillColor(248, 250, 247);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(clientX, currentY, colWidth, boxHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(darkGreenHex);
  doc.text('DADOS DO CLIENTE', clientX + 4, currentY + 6);

  const client = (proposal.clientSnapshot || {}) as any;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(graphiteHex);
  doc.text(client.name || 'Cliente não informado', clientX + 4, currentY + 12, { maxWidth: colWidth - 8 });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(mutedHex);
  let cY = currentY + 17;
  if (client.tradeName) {
    doc.text(`Nome Fantasia: ${client.tradeName}`, clientX + 4, cY, { maxWidth: colWidth - 8 });
    cY += 4.5;
  }
  doc.text(`CNPJ/CPF: ${client.document || 'Não informado'}`, clientX + 4, cY);
  cY += 4.5;
  doc.text(`Contato: ${client.contactPerson || 'Geral'}${client.role ? ` (${client.role})` : ''}`, clientX + 4, cY, { maxWidth: colWidth - 8 });
  cY += 4.5;
  doc.text(`E-mail: ${client.email || '-'}  |  Tel: ${client.phone || '-'}`, clientX + 4, cY, { maxWidth: colWidth - 8 });

  // Event Box
  doc.setFillColor(248, 250, 247);
  doc.roundedRect(eventX, currentY, colWidth, boxHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(darkGreenHex);
  doc.text('DADOS DO EVENTO', eventX + 4, currentY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(graphiteHex);
  doc.text(proposal.eventName || 'Evento', eventX + 4, currentY + 12, { maxWidth: colWidth - 8 });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(mutedHex);
  let eY = currentY + 17;
  if (proposal.eventStartDate || proposal.eventEndDate) {
    const dates = proposal.eventStartDate === proposal.eventEndDate || !proposal.eventEndDate
      ? formatDate(proposal.eventStartDate)
      : `${formatDate(proposal.eventStartDate)} a ${formatDate(proposal.eventEndDate)}`;
    doc.text(`Período: ${dates}`, eventX + 4, eY);
    eY += 4.5;
  }
  if (proposal.eventLocation) {
    doc.text(`Local: ${proposal.eventLocation}`, eventX + 4, eY, { maxWidth: colWidth - 8 });
    eY += 4.5;
  }
  const cityState = [proposal.eventCity, proposal.eventState].filter(Boolean).join(' - ');
  if (cityState) {
    doc.text(`Cidade/UF: ${cityState}`, eventX + 4, eY);
    eY += 4.5;
  }
  if (proposal.estimatedAttendees) {
    doc.text(`Público estimado: ${proposal.estimatedAttendees.toLocaleString('pt-BR')} participantes`, eventX + 4, eY);
  }

  currentY += boxHeight + 6;

  // 3. SERVICES TABLE (AutoTable)
  const tableRows = (proposal.items || []).map((item, idx) => [
    String(idx + 1).padStart(2, '0'),
    item.serviceName + (item.description ? `\n${item.description}` : ''),
    Number(item.quantity).toLocaleString('pt-BR'),
    item.unit,
    formatCurrency(item.unitPrice),
    item.discount > 0 ? formatCurrency(item.discount) : '-',
    formatCurrency(item.total)
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['#', 'Serviço e Especificação', 'Qtd', 'Unid.', 'Valor Unit.', 'Desc.', 'Total']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [7, 16, 13],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left',
      cellPadding: 2.5
    },
    styles: {
      font: 'helvetica',
      fontSize: 8,
      textColor: [33, 43, 54],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
      cellPadding: 2.5,
      overflow: 'linebreak'
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center', fontStyle: 'bold', textColor: [100, 116, 139] },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 14, halign: 'center' },
      3: { cellWidth: 18, halign: 'center', textColor: [100, 116, 139] },
      4: { cellWidth: 24, halign: 'right' },
      5: { cellWidth: 18, halign: 'right', textColor: [225, 29, 72] },
      6: { cellWidth: 26, halign: 'right', fontStyle: 'bold', textColor: [7, 16, 13] }
    },
    alternateRowStyles: {
      fillColor: [249, 251, 248]
    },
    margin: { left: margin, right: margin }
  });

  currentY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 6 : currentY + 50;

  // Check if we need a new page for totals & terms
  if (currentY + 65 > pageHeight - 20) {
    doc.addPage();
    currentY = margin + 8;
  }

  // 4. FINANCIAL SUMMARY (Right-aligned Card)
  const summaryWidth = 85;
  const summaryX = pageWidth - margin - summaryWidth;
  const notesWidth = contentWidth - summaryWidth - 6;

  // Left side: Payment terms and conditions
  doc.setFillColor(248, 250, 247);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, notesWidth, 38, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(darkGreenHex);
  doc.text('CONDIÇÕES DE PAGAMENTO', margin + 4, currentY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(graphiteHex);
  doc.text(`Condição: ${proposal.paymentTerms || 'Faturamento em 30 dias'}`, margin + 4, currentY + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(mutedHex);
  doc.text(`Forma de Pagamento: ${proposal.paymentMethod || 'Boleto bancário'}`, margin + 4, currentY + 17);

  if (proposal.financialNotes) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    const splitNotes = doc.splitTextToSize(proposal.financialNotes, notesWidth - 8);
    doc.text(splitNotes, margin + 4, currentY + 23);
  }

  // Right side: Totals Box
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(summaryX, currentY, summaryWidth, 38, 2, 2, 'FD');

  let tY = currentY + 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(mutedHex);
  doc.text('Subtotal:', summaryX + 4, tY);
  doc.text(formatCurrency(proposal.subtotal), summaryX + summaryWidth - 4, tY, { align: 'right' });

  tY += 5;
  if (proposal.discountAmount > 0) {
    doc.setTextColor(225, 29, 72);
    const discLabel = proposal.discountPercent > 0 ? `Desconto (${proposal.discountPercent}%):` : 'Desconto:';
    doc.text(discLabel, summaryX + 4, tY);
    doc.text(`- ${formatCurrency(proposal.discountAmount)}`, summaryX + summaryWidth - 4, tY, { align: 'right' });
    tY += 5;
  }

  if (proposal.additionalAmount > 0) {
    doc.setTextColor(graphiteHex);
    doc.text('Acréscimos / Taxas:', summaryX + 4, tY);
    doc.text(`+ ${formatCurrency(proposal.additionalAmount)}`, summaryX + summaryWidth - 4, tY, { align: 'right' });
    tY += 5;
  }

  // Grand Total Highlight
  doc.setFillColor(18, 224, 0);
  doc.roundedRect(summaryX + 2, currentY + 23, summaryWidth - 4, 12, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(7, 16, 13);
  doc.text('VALOR TOTAL:', summaryX + 6, currentY + 30.5);

  doc.setFontSize(12);
  doc.text(formatCurrency(proposal.finalAmount), summaryX + summaryWidth - 6, currentY + 31, { align: 'right' });

  currentY += 44;

  // 5. GENERAL CONDITIONS AND LEGAL CLAUSES
  if (currentY + 45 > pageHeight - 20) {
    doc.addPage();
    currentY = margin + 8;
  }

  const conditionsText = proposal.termsAndConditions || settings?.generalConditions || '';
  if (conditionsText) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(darkGreenHex);
    doc.text('CONDIÇÕES GERAIS E OBSERVAÇÕES', margin, currentY);
    currentY += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(mutedHex);
    const splitConditions = doc.splitTextToSize(conditionsText, contentWidth);
    doc.text(splitConditions, margin, currentY);
    currentY += splitConditions.length * 3.2 + 6;
  }

  // 6. ACCEPTANCE & SIGNATURE BLOCK
  if (currentY + 32 > pageHeight - 20) {
    doc.addPage();
    currentY = margin + 12;
  }

  doc.setDrawColor(226, 232, 240);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(darkGreenHex);
  doc.text('DE ACORDO E AUTORIZAÇÃO DE FATURAMENTO', margin, currentY);
  currentY += 14;

  const sigWidth = 70;
  // Client signature line
  doc.setDrawColor(180, 180, 180);
  doc.line(margin, currentY, margin + sigWidth, currentY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(mutedHex);
  doc.text(client.name || 'Contratante', margin, currentY + 3.5);
  doc.text('Assinatura e Carimbo / Data', margin, currentY + 7);

  // Credencia signature line
  const credX = pageWidth - margin - sigWidth;
  doc.line(credX, currentY, credX + sigWidth, currentY);
  doc.text(settings?.companyName || 'Credencia Tecnologia em Eventos', credX, currentY + 3.5);
  doc.text(proposal.responsibleName || 'Responsável Comercial', credX, currentY + 7);

  // 7. FOOTER AND NUMBERING ON ALL PAGES
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p += 1) {
    doc.setPage(p);

    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(mutedHex);

    const dynamicFooterFallback = [
      settings?.companyName || 'Credencia Tecnologia em Eventos',
      settings?.cnpj ? `CNPJ ${settings.cnpj}` : null,
      settings?.email || null,
    ].filter(Boolean).join(' • ');

    const footerText = settings?.footerText?.trim() || dynamicFooterFallback || 'Credencia Tecnologia em Eventos';
    doc.text(footerText, margin, pageHeight - 7);

    doc.text(`Página ${p} de ${totalPages}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
  }

  // 8. FILENAME SANITIZATION
  const rawClientName = client.tradeName || client.name || 'Cliente';
  const cleanClientName = rawClientName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40)
    || 'Cliente';

  const cleanPropNumber = (proposal.number || 'PROPOSTA')
    .replace(/[^a-zA-Z0-9_-]/g, '_');

  const fileName = `Proposta_${cleanPropNumber}_${cleanClientName}.pdf`;
  const buffer = Buffer.from(doc.output('arraybuffer'));

  return { buffer, fileName };
}
