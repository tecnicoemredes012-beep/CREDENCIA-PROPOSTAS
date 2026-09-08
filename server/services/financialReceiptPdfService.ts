import fs from 'fs';
import path from 'path';
import { jsPDF } from 'jspdf';
import { formatCurrency, formatDate } from '../../src/utils/formatters';

type JsPdfExtended = jsPDF;

const pageWidth = 210;
const pageHeight = 297;
const margin = 18;
const contentWidth = pageWidth - margin * 2;

// Credencia Design Colors
const greenHex = '#12e000';
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
    console.warn('Erro ao carregar logo Credencia para recibo:', err);
  }
  return null;
}

export interface ReceiptPdfData {
  receiptDoc: any;
  settings?: any;
}

export function generateFinancialReceiptPDF(data: ReceiptPdfData): { buffer: Buffer; fileName: string } {
  const { receiptDoc, settings } = data;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  }) as JsPdfExtended;

  const logoDataUrl = getLogoBase64();
  let y = margin;

  // Header band
  doc.setFillColor(7, 63, 18); // #073f12
  doc.rect(0, 0, pageWidth, 5, 'F');
  doc.setFillColor(18, 224, 0); // #12e000
  doc.rect(0, 5, pageWidth, 2, 'F');

  y = 16;

  // Header: Logo and Company Info
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', margin, y, 42, 14);
    } catch {}
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(graphiteHex);
    doc.text(settings?.companyName || 'CREDENCIAMENTO', margin, y + 8);
  }

  // Right: Receipt Number & Date Badge
  doc.setFillColor(239, 255, 237); // #efffed
  doc.roundedRect(pageWidth - margin - 60, y - 2, 60, 18, 2.5, 2.5, 'F');
  doc.setDrawColor(18, 224, 0);
  doc.setLineWidth(0.3);
  doc.roundedRect(pageWidth - margin - 60, y - 2, 60, 18, 2.5, 2.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(darkGreenHex);
  doc.text('RECIBO DE PAGAMENTO', pageWidth - margin - 30, y + 4, { align: 'center' });

  doc.setFontSize(11);
  doc.setTextColor(graphiteHex);
  doc.text(receiptDoc.receiptNumber, pageWidth - margin - 30, y + 10, { align: 'center' });

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(mutedHex);
  doc.text(`Emissão: ${formatDate(receiptDoc.receiptDate)}`, pageWidth - margin - 30, y + 14, { align: 'center' });

  y += 28;

  // Big Highlight Box: Value
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, y, contentWidth, 24, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(mutedHex);
  doc.text('VALOR RECEBIDO', margin + 6, y + 8);

  doc.setFontSize(18);
  doc.setTextColor(darkGreenHex);
  doc.text(formatCurrency(receiptDoc.amount), margin + 6, y + 18);

  // Payment method badge inside box
  doc.setFillColor(220, 252, 231);
  doc.roundedRect(pageWidth - margin - 60, y + 6, 54, 12, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(7, 63, 18);
  doc.text(`Forma: ${receiptDoc.paymentMethod}`, pageWidth - margin - 33, y + 13.5, { align: 'center' });

  y += 32;

  // Body content box
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, 86, 3, 3, 'S');

  let boxY = y + 8;
  const paddingX = margin + 8;
  const colWidth = contentWidth - 16;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(mutedHex);
  doc.text('VALOR POR EXTENSO', paddingX, boxY);
  boxY += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(graphiteHex);
  const extensoLines = doc.splitTextToSize(`(${receiptDoc.amountInWords})`, colWidth);
  doc.text(extensoLines, paddingX, boxY);
  boxY += extensoLines.length * 5 + 4;

  // Divider
  doc.setDrawColor(241, 245, 249);
  doc.line(paddingX, boxY, paddingX + colWidth, boxY);
  boxY += 6;

  // Received From (Client)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(mutedHex);
  doc.text('RECEBEMOS DE', paddingX, boxY);
  boxY += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(graphiteHex);
  doc.text(receiptDoc.clientName, paddingX, boxY);
  if (receiptDoc.clientDocument) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(mutedHex);
    doc.text(` • CNPJ/CPF: ${receiptDoc.clientDocument}`, paddingX + doc.getTextWidth(receiptDoc.clientName) + 2, boxY);
  }
  boxY += 9;

  // Referente a
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(mutedHex);
  doc.text('REFERENTE A', paddingX, boxY);
  boxY += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(graphiteHex);
  const refText = `${receiptDoc.referenceDescription}${receiptDoc.installmentDescription ? ` — ${receiptDoc.installmentDescription}` : ''}${receiptDoc.eventName ? ` | Evento: ${receiptDoc.eventName}` : ''}${receiptDoc.contractNumber ? ` | Contrato: ${receiptDoc.contractNumber}` : ''}${receiptDoc.proposalNumber ? ` | Proposta: ${receiptDoc.proposalNumber}` : ''}.`;
  const refLines = doc.splitTextToSize(refText, colWidth);
  doc.text(refLines, paddingX, boxY);
  boxY += refLines.length * 5 + 4;

  if (receiptDoc.notes) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(mutedHex);
    doc.text(`Observações: ${receiptDoc.notes}`, paddingX, boxY);
  }

  y += 96;

  // Statement of discharge
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(graphiteHex);
  const quitacaoMsg = 'Para maior clareza e firmeza das obrigações assumidas, firmamos o presente recibo dando plena e irrevogável quitação exclusivamente da parcela/valor acima especificado.';
  doc.text(doc.splitTextToSize(quitacaoMsg, contentWidth - 12), margin + 6, y + 7);

  y += 28;

  // City and Date
  const city = settings?.defaultSignatureCity || 'São Paulo - SP';
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(graphiteHex);
  doc.text(`${city}, ${formatDate(receiptDoc.receiptDate)}.`, margin, y);

  y += 24;

  // Signature Block
  const sigBoxWidth = 85;
  const sigX = margin + (contentWidth - sigBoxWidth) / 2;

  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.4);
  doc.line(sigX, y, sigX + sigBoxWidth, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(graphiteHex);
  doc.text(receiptDoc.issuerName, sigX + sigBoxWidth / 2, y + 5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(mutedHex);
  doc.text(settings?.companyName || 'Credencia Tecnologia em Eventos Ltda', sigX + sigBoxWidth / 2, y + 9, { align: 'center' });
  if (receiptDoc.issuerDocument) {
    doc.text(`CNPJ: ${receiptDoc.issuerDocument}`, sigX + sigBoxWidth / 2, y + 13, { align: 'center' });
  }

  // Footer bar
  const footerY = pageHeight - margin + 6;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(mutedHex);
  const footerText = settings?.footerText || 'Credencia Orçamentos e Eventos • Documento emitido eletronicamente';
  doc.text(footerText, margin, footerY);
  doc.text(`Recibo: ${receiptDoc.receiptNumber}`, pageWidth - margin, footerY, { align: 'right' });

  const pdfOutput = doc.output('arraybuffer');
  const buffer = Buffer.from(pdfOutput);
  const fileName = `Recibo_${receiptDoc.receiptNumber}.pdf`;

  return { buffer, fileName };
}
