import fs from 'fs';
import path from 'path';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { buildVariableMap, interpolateContractText, ContractInterpolationContext } from '../../src/utils/contractVariables';
import { formatCurrency, formatDate } from '../../src/utils/formatters';

type JsPdfWithAutoTable = jsPDF & {
  lastAutoTable?: { finalY: number };
};

const pageWidth = 210;
const pageHeight = 297;
const margin = 14;
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
    console.warn('Erro ao carregar logo Credencia:', err);
  }
  return null;
}

export interface ContractPdfData {
  contract: any;
  clauses: Array<{ clauseNumber: number; title: string; content: string; isActive: boolean }>;
  settings?: any;
}

export function generateServerContractPDF(data: ContractPdfData): { buffer: Buffer; fileName: string } {
  const { contract, clauses, settings } = data;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  }) as JsPdfWithAutoTable;

  const logoDataUrl = getLogoBase64();
  const activeClauses = clauses.filter(c => c.isActive !== false);

  // Build context for variables interpolation
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

  let currentY = margin;

  // Function to add a page and reset top position
  const checkNewPage = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - 20) {
      doc.addPage();
      currentY = margin + 10;
      return true;
    }
    return false;
  };

  // 1. HEADER ON PAGE 1
  // Top green accent bar
  doc.setFillColor(18, 224, 0);
  doc.rect(margin, currentY, contentWidth, 2, 'F');
  currentY += 5;

  // Logo
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

  // Contract header info (right side)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(graphiteHex);
  doc.text('CONTRATO DE PRESTAÇÃO DE SERVIÇOS', pageWidth - margin, currentY + 4, { align: 'right' });

  doc.setFont('courier', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(18, 160, 0);
  doc.text(contract.number, pageWidth - margin, currentY + 10, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(mutedHex);
  const versionText = contract.currentVersion > 1 ? ` (Versão ${contract.currentVersion})` : '';
  doc.text(`Proposta vinculada: ${contract.proposalNumber}  |  Emissão: ${formatDate(contract.createdAt)}${versionText}`, pageWidth - margin, currentY + 15, { align: 'right' });

  currentY += 21;

  // Thin separator
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 8;

  // Document title banner
  doc.setFillColor(248, 250, 247);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, contentWidth, 12, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(darkGreenHex);
  doc.text(contract.title || 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE CREDENCIAMENTO E TECNOLOGIA EM EVENTOS', pageWidth / 2, currentY + 7.5, { align: 'center' });
  currentY += 18;

  // 2. CLAUSES SECTION
  activeClauses.forEach((clause) => {
    const interpolatedContent = interpolateContractText(clause.content, varMap);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(darkGreenHex);

    // Calculate lines for title and text
    const titleLines = doc.splitTextToSize(clause.title, contentWidth);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const contentLines = doc.splitTextToSize(interpolatedContent, contentWidth);

    // Check if title + first few lines fit; if not, move title to new page to prevent orphan heading
    const titleHeight = titleLines.length * 4.5;
    const initialTextHeight = Math.min(contentLines.length, 3) * 4.0;
    checkNewPage(titleHeight + initialTextHeight + 6);

    // Render Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(darkGreenHex);
    doc.text(titleLines, margin, currentY);
    currentY += titleHeight + 2;

    // If this is Clause 3 (Services), render AutoTable table if items exist
    if (clause.clauseNumber === 3 && items.length > 0) {
      const tableRows = items.map((item: any, idx: number) => [
        String(idx + 1).padStart(2, '0'),
        item.serviceName + (item.description ? `\n${item.description}` : ''),
        Number(item.quantity).toLocaleString('pt-BR'),
        item.unit,
        formatCurrency(item.unitPrice),
        formatCurrency(item.total)
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [['#', 'Serviço & Especificação', 'Qtd', 'Unid.', 'Valor Unit.', 'Total']],
        body: tableRows,
        theme: 'grid',
        headStyles: {
          fillColor: [7, 16, 13],
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'left',
          cellPadding: 2.2
        },
        styles: {
          font: 'helvetica',
          fontSize: 8,
          textColor: [33, 43, 54],
          lineColor: [226, 232, 240],
          lineWidth: 0.2,
          cellPadding: 2.2,
          overflow: 'linebreak'
        },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center', fontStyle: 'bold', textColor: [100, 116, 139] },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 14, halign: 'center' },
          3: { cellWidth: 20, halign: 'center', textColor: [100, 116, 139] },
          4: { cellWidth: 26, halign: 'right' },
          5: { cellWidth: 28, halign: 'right', fontStyle: 'bold', textColor: [7, 16, 13] }
        },
        alternateRowStyles: {
          fillColor: [249, 251, 248]
        },
        margin: { left: margin, right: margin }
      });

      currentY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 4 : currentY + 30;

      // Note below services
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(mutedHex);
      doc.text('Parágrafo Único: Quaisquer serviços extraordinários serão objeto de aprovação prévia por termo aditivo.', margin, currentY);
      currentY += 8;
    } else {
      // Render text paragraphs line by line with auto page breaks
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(graphiteHex);

      for (const line of contentLines) {
        checkNewPage(4.5);
        doc.text(line, margin, currentY);
        currentY += 4.0;
      }
      currentY += 5;
    }
  });

  // 3. FOOTER AND NUMBERING ON ALL PAGES
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p += 1) {
    doc.setPage(p);

    // Bottom separator line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
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
    doc.text(`${contract.number} (Proposta ${contract.proposalNumber}) • ${footerText}`, margin, pageHeight - 7);

    doc.text(`Página ${p} de ${totalPages}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
  }

  // 4. FILENAME SANITIZATION
  const rawClientName = client.tradeName || client.name || 'Cliente';
  const cleanClientName = rawClientName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40)
    || 'Cliente';

  const cleanContractNumber = (contract.number || 'CONTRATO')
    .replace(/[^a-zA-Z0-9_-]/g, '_');

  const fileName = `Contrato_${cleanContractNumber}_${cleanClientName}.pdf`;
  const buffer = Buffer.from(doc.output('arraybuffer'));

  return { buffer, fileName };
}
