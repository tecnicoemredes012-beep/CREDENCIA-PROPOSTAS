import { Router } from 'express';
import { db } from '../database';
import { randomUUID } from 'crypto';
import { generateNextProposalNumber } from '../services/numberingService';
import { ProposalItem } from '../../src/types';
import { generateServerProposalPDF } from '../services/pdfService';

const router = Router();

// Helper to check and update expired status automatically
function autoUpdateExpiredProposals() {
  const today = new Date().toISOString().split('T')[0];
  db.prepare(`
    UPDATE proposals
    SET status = 'expired', updatedAt = datetime('now')
    WHERE isDeleted = 0
      AND dueDate < ?
      AND status NOT IN ('approved', 'rejected', 'cancelled', 'expired')
  `).run(today);
}

// Helper to resolve the most current client snapshot
export function resolveClientSnapshot(clientId?: string, existingSnapshotJson?: string, passedSnapshot?: any): any {
  if (passedSnapshot && typeof passedSnapshot === 'object' && passedSnapshot.name) {
    return passedSnapshot;
  }
  if (clientId) {
    const liveClient = db.prepare('SELECT * FROM clients WHERE id = ? AND isDeleted = 0').get(clientId);
    if (liveClient) {
      return liveClient;
    }
  }
  if (existingSnapshotJson) {
    try {
      return typeof existingSnapshotJson === 'string' ? JSON.parse(existingSnapshotJson) : existingSnapshotJson;
    } catch {
      return {};
    }
  }
  return {};
}

// GET preview of next proposal number
router.get('/next-number', (req, res) => {
  try {
    const next = generateNextProposalNumber();
    res.json(next);
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao gerar prévia da numeração: ' + err.message });
  }
});

// GET all proposals with filters
router.get('/', (req, res) => {
  try {
    autoUpdateExpiredProposals();

    const { search, status, startDate, endDate, responsible } = req.query;

    let query = `
      SELECT p.*
      FROM proposals p
      WHERE p.isDeleted = 0
    `;
    const params: any[] = [];

    if (status) {
      query += ` AND p.status = ?`;
      params.push(String(status));
    }

    if (responsible) {
      query += ` AND p.responsibleName LIKE ?`;
      params.push(`%${String(responsible).trim()}%`);
    }

    if (startDate) {
      query += ` AND p.issueDate >= ?`;
      params.push(String(startDate));
    }

    if (endDate) {
      query += ` AND p.issueDate <= ?`;
      params.push(String(endDate));
    }

    if (search) {
      const term = `%${String(search).trim()}%`;
      query += ` AND (p.number LIKE ? OR p.eventName LIKE ? OR json_extract(p.clientSnapshot, '$.name') LIKE ? OR json_extract(p.clientSnapshot, '$.tradeName') LIKE ? OR json_extract(p.clientSnapshot, '$.document') LIKE ?)`;
      params.push(term, term, term, term, term);
    }

    query += ` ORDER BY p.year DESC, p.sequenceNumber DESC`;

    const rows = db.prepare(query).all(...params);

    // Parse snapshots and attach items with up-to-date client data
    const proposals = rows.map((p: any) => {
      const items = db.prepare('SELECT * FROM proposal_items WHERE proposalId = ? ORDER BY orderIndex ASC').all(p.id);
      const clientSnapshot = resolveClientSnapshot(p.clientId, p.clientSnapshot);
      return {
        ...p,
        clientSnapshot,
        items
      };
    });

    res.json(proposals);
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao listar propostas: ' + err.message });
  }
});

// GET proposal by ID
router.get('/:id', (req, res) => {
  try {
    autoUpdateExpiredProposals();

    const row: any = db.prepare('SELECT * FROM proposals WHERE id = ? AND isDeleted = 0').get(req.params.id);
    if (!row) {
      return res.status(404).json({ error: 'Proposta não encontrada' });
    }

    const items = db.prepare('SELECT * FROM proposal_items WHERE proposalId = ? ORDER BY orderIndex ASC').all(row.id);
    const history = db.prepare('SELECT * FROM proposal_status_history WHERE proposalId = ? ORDER BY createdAt ASC').all(row.id);

    const clientSnapshot = resolveClientSnapshot(row.clientId, row.clientSnapshot);

    res.json({
      ...row,
      clientSnapshot,
      items,
      history
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao buscar proposta: ' + err.message });
  }
});

// GET proposal PDF (official download and preview stream)
router.get('/:id/pdf', (req, res) => {
  try {
    const row: any = db.prepare('SELECT * FROM proposals WHERE id = ? AND isDeleted = 0').get(req.params.id);
    if (!row) {
      return res.status(404).json({ error: 'Proposta não encontrada' });
    }

    const items: any = db.prepare('SELECT * FROM proposal_items WHERE proposalId = ? ORDER BY orderIndex ASC').all(row.id);
    const settingsRow: any = db.prepare("SELECT * FROM system_settings WHERE id = 'default'").get()
      || db.prepare("SELECT * FROM system_settings LIMIT 1").get();

    const clientSnapshot = resolveClientSnapshot(row.clientId, row.clientSnapshot);

    const proposal: any = {
      ...row,
      clientSnapshot,
      items
    };

    const { buffer, fileName } = generateServerProposalPDF(proposal, settingsRow);

    // Update status to 'generated' if currently draft
    if (proposal.status === 'draft') {
      db.prepare("UPDATE proposals SET status = 'generated', pdfGeneratedAt = datetime('now'), updatedAt = datetime('now') WHERE id = ?").run(proposal.id);
    } else {
      db.prepare("UPDATE proposals SET pdfGeneratedAt = datetime('now'), updatedAt = datetime('now') WHERE id = ?").run(proposal.id);
    }

    const isInline = req.query.view === 'inline';
    res.setHeader('Content-Type', 'application/pdf');
    if (isInline) {
      res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    } else {
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`);
    }
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.send(buffer);
  } catch (err: any) {
    console.error('Erro ao gerar PDF da proposta:', err);
    res.status(500).json({ error: 'Erro ao gerar PDF: ' + err.message });
  }
});

// POST create proposal (Atomic transaction)
router.post('/', (req, res) => {
  try {
    const {
      clientId,
      issueDate,
      validityDays = 15,
      dueDate,
      responsibleName,
      status = 'draft',
      eventName,
      eventStartDate,
      eventEndDate,
      eventLocation,
      eventCity,
      eventState,
      estimatedAttendees,
      eventNotes,
      items = [],
      subtotal,
      discountPercent = 0,
      discountAmount = 0,
      additionalAmount = 0,
      finalAmount,
      paymentMethod = 'Boleto bancário',
      paymentTerms = 'Faturamento em 30 dias',
      financialNotes,
      internalNotes,
      termsAndConditions
    } = req.body;

    if (!clientId) {
      return res.status(400).json({ error: 'Selecione um cliente para a proposta.' });
    }
    if (!eventName || !eventName.trim()) {
      return res.status(400).json({ error: 'Informe o nome do evento.' });
    }
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Adicione pelo menos um serviço na proposta.' });
    }

    // 1. Fetch client to create immutable snapshot
    const client = db.prepare('SELECT * FROM clients WHERE id = ? AND isDeleted = 0').get(clientId);
    if (!client) {
      return res.status(400).json({ error: 'Cliente selecionado não foi encontrado.' });
    }

    const proposalId = randomUUID();
    const now = new Date().toISOString();
    const effectiveIssueDate = issueDate || now.split('T')[0];
    const year = Number(effectiveIssueDate.split('-')[0]) || new Date().getFullYear();

    // 2. Transactional execution
    const createTransaction = db.transaction(() => {
      // Generate atomic sequence number
      const numInfo = generateNextProposalNumber(year);

      // Insert proposal
      db.prepare(`
        INSERT INTO proposals (
          id, number, sequenceNumber, year, status, issueDate, validityDays, dueDate,
          responsibleName, clientId, clientSnapshot, eventName, eventStartDate, eventEndDate,
          eventLocation, eventCity, eventState, estimatedAttendees, eventNotes,
          subtotal, discountPercent, discountAmount, additionalAmount, finalAmount,
          paymentMethod, paymentTerms, financialNotes, internalNotes, termsAndConditions,
          isDeleted, createdAt, updatedAt
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?
        )
      `).run(
        proposalId,
        numInfo.number,
        numInfo.sequenceNumber,
        year,
        status,
        effectiveIssueDate,
        Number(validityDays),
        dueDate || effectiveIssueDate,
        responsibleName?.trim() || 'Comercial Credencia',
        clientId,
        JSON.stringify(client),
        eventName.trim(),
        eventStartDate || null,
        eventEndDate || null,
        eventLocation?.trim() || null,
        eventCity?.trim() || null,
        eventState?.trim() || null,
        estimatedAttendees ? Number(estimatedAttendees) : null,
        eventNotes?.trim() || null,
        Number(subtotal) || 0,
        Number(discountPercent) || 0,
        Number(discountAmount) || 0,
        Number(additionalAmount) || 0,
        Number(finalAmount) || 0,
        paymentMethod?.trim() || 'Boleto bancário',
        paymentTerms?.trim() || 'Faturamento em 30 dias',
        financialNotes?.trim() || null,
        internalNotes?.trim() || null,
        termsAndConditions?.trim() || null,
        now,
        now
      );

      // Insert proposal items with snapshots
      const insertItemStmt = db.prepare(`
        INSERT INTO proposal_items (
          id, proposalId, serviceId, orderIndex, serviceName, description, unit, unitPrice, quantity, discount, total
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      items.forEach((item: ProposalItem, index: number) => {
        const itemId = randomUUID();
        const itemTotal = Math.max(0, (Number(item.quantity) * Number(item.unitPrice)) - (Number(item.discount) || 0));
        insertItemStmt.run(
          itemId,
          proposalId,
          item.serviceId || null,
          item.orderIndex !== undefined ? item.orderIndex : index + 1,
          item.serviceName.trim(),
          item.description?.trim() || '',
          item.unit.trim(),
          Number(item.unitPrice),
          Number(item.quantity),
          Number(item.discount) || 0,
          itemTotal
        );
      });

      // Record initial history
      db.prepare(`
        INSERT INTO proposal_status_history (id, proposalId, previousStatus, newStatus, changedBy, reason, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        randomUUID(),
        proposalId,
        null,
        status,
        responsibleName || 'Sistema',
        'Proposta comercial criada',
        now
      );

      return numInfo.number;
    });

    const generatedNumber = createTransaction();

    // Fetch created proposal with full data
    const createdProposal: any = db.prepare('SELECT * FROM proposals WHERE id = ?').get(proposalId);
    const createdItems = db.prepare('SELECT * FROM proposal_items WHERE proposalId = ? ORDER BY orderIndex ASC').all(proposalId);

    res.status(201).json({
      ...createdProposal,
      clientSnapshot: JSON.parse(createdProposal.clientSnapshot),
      items: createdItems
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao salvar proposta: ' + err.message });
  }
});

// PUT update proposal
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const {
      clientId,
      issueDate,
      validityDays,
      dueDate,
      responsibleName,
      status,
      eventName,
      eventStartDate,
      eventEndDate,
      eventLocation,
      eventCity,
      eventState,
      estimatedAttendees,
      eventNotes,
      items = [],
      subtotal,
      discountPercent,
      discountAmount,
      additionalAmount,
      finalAmount,
      paymentMethod,
      paymentTerms,
      financialNotes,
      internalNotes,
      termsAndConditions
    } = req.body;

    const existing: any = db.prepare('SELECT * FROM proposals WHERE id = ? AND isDeleted = 0').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Proposta não encontrada' });
    }

    if (existing.status === 'cancelled') {
      return res.status(400).json({ error: 'Propostas canceladas não podem ser alteradas.' });
    }

    // Always resolve current client snapshot from live database or payload
    const targetClientId = clientId || existing.clientId;
    const resolvedClient = resolveClientSnapshot(targetClientId, existing.clientSnapshot, req.body.clientSnapshot);
    const clientSnapshot = JSON.stringify(resolvedClient);

    const now = new Date().toISOString();

    const updateTransaction = db.transaction(() => {
      // Update proposal details (preserves number, sequenceNumber, year)
      db.prepare(`
        UPDATE proposals SET
          clientId = ?, clientSnapshot = ?, issueDate = ?, validityDays = ?, dueDate = ?,
          responsibleName = ?, eventName = ?, eventStartDate = ?, eventEndDate = ?,
          eventLocation = ?, eventCity = ?, eventState = ?, estimatedAttendees = ?, eventNotes = ?,
          subtotal = ?, discountPercent = ?, discountAmount = ?, additionalAmount = ?, finalAmount = ?,
          paymentMethod = ?, paymentTerms = ?, financialNotes = ?, internalNotes = ?, termsAndConditions = ?,
          updatedAt = ?
        WHERE id = ?
      `).run(
        targetClientId,
        clientSnapshot,
        issueDate || existing.issueDate,
        validityDays !== undefined ? Number(validityDays) : existing.validityDays,
        dueDate || existing.dueDate,
        responsibleName || existing.responsibleName,
        eventName.trim(),
        eventStartDate || null,
        eventEndDate || null,
        eventLocation?.trim() || null,
        eventCity?.trim() || null,
        eventState?.trim() || null,
        estimatedAttendees ? Number(estimatedAttendees) : null,
        eventNotes?.trim() || null,
        Number(subtotal) || 0,
        Number(discountPercent) || 0,
        Number(discountAmount) || 0,
        Number(additionalAmount) || 0,
        Number(finalAmount) || 0,
        paymentMethod || existing.paymentMethod,
        paymentTerms || existing.paymentTerms,
        financialNotes?.trim() || null,
        internalNotes?.trim() || null,
        termsAndConditions?.trim() || null,
        now,
        id
      );

      // Also update linked contracts if any
      try {
        db.prepare(`
          UPDATE contracts
          SET clientSnapshot = ?, updatedAt = ?
          WHERE proposalId = ?
        `).run(clientSnapshot, now, id);
      } catch (ctrSyncErr) {
        console.error('Erro ao atualizar contrato vinculado:', ctrSyncErr);
      }

      // Replace items
      db.prepare('DELETE FROM proposal_items WHERE proposalId = ?').run(id);

      const insertItemStmt = db.prepare(`
        INSERT INTO proposal_items (
          id, proposalId, serviceId, orderIndex, serviceName, description, unit, unitPrice, quantity, discount, total
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      items.forEach((item: ProposalItem, index: number) => {
        const itemId = randomUUID();
        const itemTotal = Math.max(0, (Number(item.quantity) * Number(item.unitPrice)) - (Number(item.discount) || 0));
        insertItemStmt.run(
          itemId,
          id,
          item.serviceId || null,
          item.orderIndex !== undefined ? item.orderIndex : index + 1,
          item.serviceName.trim(),
          item.description?.trim() || '',
          item.unit.trim(),
          Number(item.unitPrice),
          Number(item.quantity),
          Number(item.discount) || 0,
          itemTotal
        );
      });
    });

    updateTransaction();

    const updatedProposal: any = db.prepare('SELECT * FROM proposals WHERE id = ?').get(id);
    const updatedItems = db.prepare('SELECT * FROM proposal_items WHERE proposalId = ? ORDER BY orderIndex ASC').all(id);

    res.json({
      ...updatedProposal,
      clientSnapshot: JSON.parse(updatedProposal.clientSnapshot),
      items: updatedItems
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao atualizar proposta: ' + err.message });
  }
});

// POST duplicate proposal (generates NEW atomic number)
router.post('/:id/duplicate', (req, res) => {
  try {
    const { id } = req.params;
    const original: any = db.prepare('SELECT * FROM proposals WHERE id = ? AND isDeleted = 0').get(id);
    if (!original) {
      return res.status(404).json({ error: 'Proposta original não encontrada.' });
    }

    const originalItems: any[] = db.prepare('SELECT * FROM proposal_items WHERE proposalId = ? ORDER BY orderIndex ASC').all(id);

    const newId = randomUUID();
    const now = new Date().toISOString();
    const today = now.split('T')[0];
    const year = new Date().getFullYear();

    // Calculate new dueDate based on original validityDays
    const dueDate = new Date(Date.now() + original.validityDays * 86400000).toISOString().split('T')[0];

    const duplicateTransaction = db.transaction(() => {
      const numInfo = generateNextProposalNumber(year);

      db.prepare(`
        INSERT INTO proposals (
          id, number, sequenceNumber, year, status, issueDate, validityDays, dueDate,
          responsibleName, clientId, clientSnapshot, eventName, eventStartDate, eventEndDate,
          eventLocation, eventCity, eventState, estimatedAttendees, eventNotes,
          subtotal, discountPercent, discountAmount, additionalAmount, finalAmount,
          paymentMethod, paymentTerms, financialNotes, internalNotes, termsAndConditions,
          isDeleted, createdAt, updatedAt
        ) VALUES (
          ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?
        )
      `).run(
        newId,
        numInfo.number,
        numInfo.sequenceNumber,
        year,
        today,
        original.validityDays,
        dueDate,
        original.responsibleName,
        original.clientId,
        original.clientSnapshot,
        `${original.eventName} (Cópia)`,
        original.eventStartDate,
        original.eventEndDate,
        original.eventLocation,
        original.eventCity,
        original.eventState,
        original.estimatedAttendees,
        original.eventNotes,
        original.subtotal,
        original.discountPercent,
        original.discountAmount,
        original.additionalAmount,
        original.finalAmount,
        original.paymentMethod,
        original.paymentTerms,
        original.financialNotes,
        `Duplicada a partir da proposta ${original.number}`,
        original.termsAndConditions,
        now,
        now
      );

      const insertItemStmt = db.prepare(`
        INSERT INTO proposal_items (
          id, proposalId, serviceId, orderIndex, serviceName, description, unit, unitPrice, quantity, discount, total
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      originalItems.forEach(item => {
        insertItemStmt.run(
          randomUUID(),
          newId,
          item.serviceId,
          item.orderIndex,
          item.serviceName,
          item.description,
          item.unit,
          item.unitPrice,
          item.quantity,
          item.discount,
          item.total
        );
      });

      db.prepare(`
        INSERT INTO proposal_status_history (id, proposalId, previousStatus, newStatus, changedBy, reason, createdAt)
        VALUES (?, ?, null, 'draft', ?, ?, ?)
      `).run(
        randomUUID(),
        newId,
        original.responsibleName || 'Sistema',
        `Duplicada com sucesso a partir de ${original.number}`,
        now
      );

      return numInfo.number;
    });

    const newNumber = duplicateTransaction();

    const created: any = db.prepare('SELECT * FROM proposals WHERE id = ?').get(newId);
    const createdItems = db.prepare('SELECT * FROM proposal_items WHERE proposalId = ? ORDER BY orderIndex ASC').all(newId);

    res.status(201).json({
      ...created,
      clientSnapshot: JSON.parse(created.clientSnapshot),
      items: createdItems
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao duplicar proposta: ' + err.message });
  }
});

// PATCH change proposal status
router.patch('/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const { status, changedBy = 'Operador', reason } = req.body;

    const proposal: any = db.prepare('SELECT * FROM proposals WHERE id = ? AND isDeleted = 0').get(id);
    if (!proposal) {
      return res.status(404).json({ error: 'Proposta não encontrada' });
    }

    const previousStatus = proposal.status;
    const now = new Date().toISOString();

    let approvedAt = proposal.approvedAt;
    let cancelledAt = proposal.cancelledAt;

    if (status === 'approved' && !approvedAt) {
      approvedAt = now;
    }
    if (status === 'cancelled' && !cancelledAt) {
      cancelledAt = now;
    }

    db.prepare(`
      UPDATE proposals SET
        status = ?, approvedAt = ?, cancelledAt = ?, updatedAt = ?
      WHERE id = ?
    `).run(status, approvedAt, cancelledAt, now, id);

    // Record in history
    db.prepare(`
      INSERT INTO proposal_status_history (id, proposalId, previousStatus, newStatus, changedBy, reason, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(randomUUID(), id, previousStatus, status, changedBy, reason || null, now);

    const updated: any = db.prepare('SELECT * FROM proposals WHERE id = ?').get(id);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao alterar status da proposta: ' + err.message });
  }
});

// PATCH mark PDF generated
router.patch('/:id/pdf-generated', (req, res) => {
  try {
    const { id } = req.params;
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE proposals SET pdfGeneratedAt = ?, updatedAt = ? WHERE id = ?
    `).run(now, now, id);

    res.json({ message: 'Data de PDF registrada com sucesso', pdfGeneratedAt: now });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE soft delete proposal
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const now = new Date().toISOString();

    const result = db.prepare('UPDATE proposals SET isDeleted = 1, updatedAt = ? WHERE id = ?').run(now, id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Proposta não encontrada' });
    }

    res.json({ message: 'Proposta excluída com sucesso (histórico e número preservados).' });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao excluir proposta: ' + err.message });
  }
});

export default router;
