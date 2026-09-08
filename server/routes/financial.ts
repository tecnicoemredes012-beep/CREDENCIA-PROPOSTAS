import { Router } from 'express';
import { db, roundMoney, toCents, fromCents } from '../database';
import { randomUUID } from 'crypto';
import {
  generateNextReceiptDocNumber,
  generateNextReceivableCode,
  generateNextPayableCode,
  valorPorExtenso
} from '../services/financialUtils';
import { generateFinancialReceiptPDF } from '../services/financialReceiptPdfService';

const router = Router();

// Helper to check if a due date is overdue compared to today
function isDateOverdue(dueDate: string): boolean {
  if (!dueDate) return false;
  const today = new Date().toISOString().split('T')[0];
  return dueDate < today;
}

// ==========================================================
// 1. DASHBOARD & OVERVIEW
// ==========================================================
router.get('/overview', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const next7Days = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    const next30Days = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

    // Receivables metrics
    const recTotals: any = db.prepare(`
      SELECT
        SUM(originalAmount) as totalExpected,
        SUM(receivedAmount) as totalReceived,
        SUM(CASE WHEN status != 'cancelled' AND status != 'paid' AND dueDate < ? THEN balance ELSE 0 END) as totalOverdue,
        SUM(CASE WHEN status != 'cancelled' AND status != 'paid' AND dueDate >= ? THEN balance ELSE 0 END) as totalPending
      FROM financial_receivable_installments
      WHERE status != 'cancelled'
    `).get(today, today) || {};

    // Payables metrics
    const payTotals: any = db.prepare(`
      SELECT
        SUM(originalAmount) as totalExpected,
        SUM(paidAmount) as totalPaid,
        SUM(CASE WHEN status != 'cancelled' AND status != 'paid' AND dueDate < ? THEN balance ELSE 0 END) as totalOverdue,
        SUM(CASE WHEN status != 'cancelled' AND status != 'paid' AND dueDate >= ? THEN balance ELSE 0 END) as totalPending
      FROM financial_payable_installments
      WHERE status != 'cancelled'
    `).get(today, today) || {};

    // Today's receipts and payments
    const todayReceipts: any = db.prepare(`
      SELECT COUNT(*) as count, SUM(amount) as total
      FROM financial_receipts
      WHERE isReversed = 0 AND receivedDate = ?
    `).get(today) || {};

    const todayPayments: any = db.prepare(`
      SELECT COUNT(*) as count, SUM(amount) as total
      FROM financial_payments
      WHERE isReversed = 0 AND paymentDate = ?
    `).get(today) || {};

    // Upcoming due amounts in 7 and 30 days
    const next7DaysRec: any = db.prepare(`
      SELECT SUM(balance) as total
      FROM financial_receivable_installments
      WHERE status != 'cancelled' AND status != 'paid' AND dueDate BETWEEN ? AND ?
    `).get(today, next7Days) || {};

    const next30DaysRec: any = db.prepare(`
      SELECT SUM(balance) as total
      FROM financial_receivable_installments
      WHERE status != 'cancelled' AND status != 'paid' AND dueDate BETWEEN ? AND ?
    `).get(today, next30Days) || {};

    // Events with negative results (prejuízo)
    const eventsQuery = db.prepare(`
      SELECT
        r.eventName,
        SUM(r.finalAmount) as revenue,
        COALESCE((
          SELECT SUM(p.amount)
          FROM financial_payables p
          WHERE p.eventName = r.eventName AND p.isDeleted = 0 AND p.status != 'cancelled'
        ), 0) as expense
      FROM financial_receivables r
      WHERE r.isDeleted = 0 AND r.status != 'cancelled'
      GROUP BY r.eventName
    `).all() as any[];

    const negativeEvents = eventsQuery.filter(e => (e.revenue - e.expense) < 0);

    // Recent movements (last 10 receipts and payments combined)
    const receiptsRecent = db.prepare(`
      SELECT
        rc.id,
        rc.receivedDate as date,
        'entrada' as type,
        r.eventName,
        r.clientSnapshot,
        r.contractNumber,
        rc.amount,
        rc.paymentMethod,
        'Recebido' as status,
        'Recebimento ' || r.eventName as description
      FROM financial_receipts rc
      JOIN financial_receivables r ON rc.receivableId = r.id
      WHERE rc.isReversed = 0
      ORDER BY rc.receivedDate DESC, rc.createdAt DESC
      LIMIT 6
    `).all() as any[];

    const paymentsRecent = db.prepare(`
      SELECT
        p.id,
        p.paymentDate as date,
        'saida' as type,
        py.eventName,
        py.supplierName,
        py.description,
        p.amount,
        p.paymentMethod,
        'Pago' as status
      FROM financial_payments p
      JOIN financial_payables py ON p.payableId = py.id
      WHERE p.isReversed = 0
      ORDER BY p.paymentDate DESC, p.createdAt DESC
      LIMIT 6
    `).all() as any[];

    const recentMovements = [...receiptsRecent.map(r => {
      let clientName = 'Cliente';
      try {
        const snap = JSON.parse(r.clientSnapshot);
        clientName = snap.tradeName || snap.name || 'Cliente';
      } catch {}
      return {
        id: r.id,
        date: r.date,
        type: 'entrada' as const,
        description: r.description || `Recebimento Contrato ${r.contractNumber || ''}`,
        amount: r.amount,
        partyName: clientName,
        eventName: r.eventName,
        status: 'Recebido'
      };
    }), ...paymentsRecent.map(p => ({
      id: p.id,
      date: p.date,
      type: 'saida' as const,
      description: p.description,
      amount: p.amount,
      partyName: p.supplierName,
      eventName: p.eventName,
      status: 'Pago'
    }))].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);

    const recExpected = roundMoney(recTotals.totalExpected || 0);
    const recReceived = roundMoney(recTotals.totalReceived || 0);
    const payExpected = roundMoney(payTotals.totalExpected || 0);
    const payPaid = roundMoney(payTotals.totalPaid || 0);

    res.json({
      totalReceivableExpected: recExpected,
      totalReceivableReceived: recReceived,
      totalReceivableOverdue: roundMoney(recTotals.totalOverdue || 0),
      totalReceivablePending: roundMoney(recTotals.totalPending || 0),
      totalPayableExpected: payExpected,
      totalPayablePaid: payPaid,
      totalPayableOverdue: roundMoney(payTotals.totalOverdue || 0),
      totalPayablePending: roundMoney(payTotals.totalPending || 0),
      operationalBalanceRealized: roundMoney(recReceived - payPaid),
      operationalBalanceExpected: roundMoney(recExpected - payExpected),
      todayReceiptsCount: todayReceipts.count || 0,
      todayReceiptsAmount: roundMoney(todayReceipts.total || 0),
      todayPaymentsCount: todayPayments.count || 0,
      todayPaymentsAmount: roundMoney(todayPayments.total || 0),
      next7DaysDueAmount: roundMoney(next7DaysRec.total || 0),
      next30DaysDueAmount: roundMoney(next30DaysRec.total || 0),
      negativeEventsCount: negativeEvents.length,
      recentMovements
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao carregar métricas financeiras: ' + err.message });
  }
});

// ==========================================================
// 2. CONTAS BANCÁRIAS E CATEGORIAS
// ==========================================================
router.get('/accounts', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM financial_accounts WHERE isActive = 1 ORDER BY isDefault DESC, name ASC').all();
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao listar contas: ' + err.message });
  }
});

router.get('/categories', (req, res) => {
  try {
    const { type, all } = req.query;
    let query = 'SELECT * FROM financial_categories WHERE 1=1';
    const params: any[] = [];
    if (!all) {
      query += ' AND isActive = 1';
    }
    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }
    query += ' ORDER BY type ASC, name ASC';
    const rows = db.prepare(query).all(...params);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao listar categorias: ' + err.message });
  }
});

router.post('/categories', (req, res) => {
  try {
    const { name, type = 'expense', color = '#0284c7' } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'O nome da categoria é obrigatório.' });
    }
    const id = randomUUID();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO financial_categories (id, name, type, color, isSystem, isActive, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, 0, 1, ?, ?)
    `).run(id, name.trim(), type, color, now, now);

    res.json({ id, name: name.trim(), type, color, isSystem: 0, isActive: 1 });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao criar categoria: ' + err.message });
  }
});

router.put('/categories/:id', (req, res) => {
  try {
    const { name, color, isActive } = req.body;
    const cat: any = db.prepare('SELECT * FROM financial_categories WHERE id = ?').get(req.params.id);
    if (!cat) return res.status(404).json({ error: 'Categoria não encontrada.' });

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE financial_categories
      SET name = COALESCE(?, name),
          color = COALESCE(?, color),
          isActive = COALESCE(?, isActive),
          updatedAt = ?
      WHERE id = ?
    `).run(name?.trim() || null, color || null, isActive !== undefined ? (isActive ? 1 : 0) : null, now, cat.id);

    res.json({ success: true, message: 'Categoria atualizada.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao atualizar categoria: ' + err.message });
  }
});

router.patch('/categories/:id/toggle', (req, res) => {
  try {
    const cat: any = db.prepare('SELECT * FROM financial_categories WHERE id = ?').get(req.params.id);
    if (!cat) return res.status(404).json({ error: 'Categoria não encontrada.' });

    const newActive = cat.isActive ? 0 : 1;
    const now = new Date().toISOString();
    db.prepare('UPDATE financial_categories SET isActive = ?, updatedAt = ? WHERE id = ?').run(newActive, now, cat.id);

    res.json({ success: true, isActive: newActive });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao alterar status da categoria: ' + err.message });
  }
});

// ==========================================================
// 3. CONTAS A RECEBER (RECEIVABLES)
// ==========================================================

// Check if a contract already has a financial receivable
router.get('/receivables/by-contract/:contractId', (req, res) => {
  try {
    const row: any = db.prepare(`
      SELECT * FROM financial_receivables
      WHERE contractId = ? AND isDeleted = 0
    `).get(req.params.contractId);

    if (!row) {
      return res.json({ exists: false });
    }

    const installments = db.prepare(`
      SELECT * FROM financial_receivable_installments
      WHERE receivableId = ?
      ORDER BY installmentNumber ASC
    `).all(row.id);

    res.json({ exists: true, receivable: { ...row, installments } });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao consultar financeiro do contrato: ' + err.message });
  }
});

// List all receivables with filters
router.get('/receivables', (req, res) => {
  try {
    const { search, status, proposalNumber, contractNumber, clientId, eventName, paymentMethod, dueDateFrom, dueDateTo } = req.query;

    let query = `
      SELECT r.*
      FROM financial_receivables r
      WHERE r.isDeleted = 0
    `;
    const params: any[] = [];

    if (status) {
      query += ` AND r.status = ?`;
      params.push(String(status));
    }
    if (proposalNumber) {
      query += ` AND r.proposalNumber LIKE ?`;
      params.push(`%${String(proposalNumber).trim()}%`);
    }
    if (contractNumber) {
      query += ` AND r.contractNumber LIKE ?`;
      params.push(`%${String(contractNumber).trim()}%`);
    }
    if (clientId) {
      query += ` AND r.clientId = ?`;
      params.push(String(clientId));
    }
    if (eventName) {
      query += ` AND r.eventName LIKE ?`;
      params.push(`%${String(eventName).trim()}%`);
    }
    if (paymentMethod) {
      query += ` AND r.paymentMethod = ?`;
      params.push(String(paymentMethod));
    }
    if (search) {
      const term = `%${String(search).trim()}%`;
      query += ` AND (
        r.code LIKE ?
        OR r.proposalNumber LIKE ?
        OR r.contractNumber LIKE ?
        OR r.eventName LIKE ?
        OR json_extract(r.clientSnapshot, '$.name') LIKE ?
        OR json_extract(r.clientSnapshot, '$.tradeName') LIKE ?
      )`;
      params.push(term, term, term, term, term, term);
    }

    query += ` ORDER BY r.year DESC, r.sequenceNumber DESC`;

    const rows = db.prepare(query).all(...params) as any[];

    // Attach installments and compute dynamic overdue status if applicable
    const today = new Date().toISOString().split('T')[0];
    const receivables = rows.map((r) => {
      const clientSnapshot = typeof r.clientSnapshot === 'string' ? JSON.parse(r.clientSnapshot) : r.clientSnapshot;
      const installments = db.prepare(`
        SELECT * FROM financial_receivable_installments
        WHERE receivableId = ?
        ORDER BY installmentNumber ASC
      `).all(r.id) as any[];

      // Compute status for installments
      const updatedInstallments = installments.map(inst => {
        let currentStatus = inst.status;
        if (currentStatus === 'pending' && inst.dueDate < today) {
          currentStatus = 'overdue';
        }
        return {
          ...inst,
          status: currentStatus
        };
      });

      // Compute overall status
      let overallStatus = r.status;
      if (overallStatus !== 'cancelled' && overallStatus !== 'paid') {
        const hasOverdue = updatedInstallments.some(i => i.status === 'overdue');
        if (hasOverdue) overallStatus = 'overdue';
      }

      return {
        ...r,
        status: overallStatus,
        clientSnapshot,
        installments: updatedInstallments
      };
    });

    res.json(receivables);
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao listar contas a receber: ' + err.message });
  }
});

// GET single receivable by ID with full relations and audit history
router.get('/receivables/:id', (req, res) => {
  try {
    const row: any = db.prepare('SELECT * FROM financial_receivables WHERE id = ? AND isDeleted = 0').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Título a receber não encontrado.' });

    const clientSnapshot = typeof row.clientSnapshot === 'string' ? JSON.parse(row.clientSnapshot) : row.clientSnapshot;
    const today = new Date().toISOString().split('T')[0];

    const installments = (db.prepare(`
      SELECT * FROM financial_receivable_installments
      WHERE receivableId = ?
      ORDER BY installmentNumber ASC
    `).all(row.id) as any[]).map(inst => {
      const receipts = db.prepare(`
        SELECT rc.*, a.name as accountName
        FROM financial_receipts rc
        LEFT JOIN financial_accounts a ON rc.destinationAccountId = a.id
        WHERE rc.installmentId = ?
        ORDER BY rc.receivedDate DESC
      `).all(inst.id);

      let status = inst.status;
      if (status === 'pending' && inst.dueDate < today) {
        status = 'overdue';
      }

      return { ...inst, status, receipts };
    });

    const history = db.prepare(`
      SELECT * FROM financial_history
      WHERE entityType = 'receivable' AND entityId = ?
      ORDER BY createdAt DESC
    `).all(row.id);

    res.json({
      ...row,
      clientSnapshot,
      installments,
      history
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao buscar título a receber: ' + err.message });
  }
});

// POST Generate Financial Receivable From Signed Contract
router.post('/receivables/from-contract/:contractId', (req, res) => {
  try {
    const contract: any = db.prepare('SELECT * FROM contracts WHERE id = ? AND isDeleted = 0').get(req.params.contractId);
    if (!contract) return res.status(404).json({ error: 'Contrato não encontrado.' });

    // Check settings for permission exception
    const settings: any = db.prepare("SELECT * FROM system_settings WHERE id = 'default'").get() || {};
    const allowWithoutContract = Boolean(settings.allowFinancialWithoutContract);
    const forceRelease = Boolean(req.body.forceRelease);

    if (contract.status !== 'signed' && contract.status !== 'active') {
      if (!allowWithoutContract && !forceRelease) {
        return res.status(400).json({
          error: 'Por padrão, somente contratos com status "Assinado" ou "Ativo" podem gerar financeiro.',
          requiresConfirmation: true
        });
      }
    }

    // Check duplication
    const existing: any = db.prepare('SELECT id, code FROM financial_receivables WHERE contractId = ? AND isDeleted = 0').get(contract.id);
    if (existing) {
      return res.status(409).json({
        error: 'Este contrato já possui lançamentos financeiros.',
        receivableId: existing.id,
        code: existing.code
      });
    }

    // Parse snapshots
    const client = typeof contract.clientSnapshot === 'string' ? JSON.parse(contract.clientSnapshot) : (contract.clientSnapshot || {});
    const proposal = typeof contract.proposalSnapshot === 'string' ? JSON.parse(contract.proposalSnapshot) : (contract.proposalSnapshot || {});
    const event = typeof contract.eventSnapshot === 'string' ? JSON.parse(contract.eventSnapshot) : (contract.eventSnapshot || {});

    // Target final amount must be the contract/proposal final value
    const finalAmount = roundMoney(proposal.finalAmount || 0);
    if (finalAmount <= 0) {
      return res.status(400).json({ error: 'O valor final do contrato deve ser maior que zero para gerar o financeiro.' });
    }

    const {
      paymentConditionType = 'a_vista', // 'a_vista' | 'parcelado' | 'entrada_parcelas'
      paymentMethod = proposal.paymentMethod || 'Boleto bancário',
      paymentTerms = proposal.paymentTerms || 'Faturamento em 30 dias',
      installmentsCount = 1,
      entryAmount = 0,
      entryDate = new Date().toISOString().split('T')[0],
      firstDueDate = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      intervalDays = 30,
      destinationAccountId = 'acc-default-itau',
      notes = '',
      performedBy = 'Administrador',
      customInstallments // Optional array of { installmentNumber, dueDate, amount, isEntry }
    } = req.body;

    const numInstallments = Math.max(1, parseInt(String(installmentsCount), 10) || 1);
    const parsedEntryAmount = paymentConditionType === 'entrada_parcelas' ? roundMoney(entryAmount) : 0;

    if (parsedEntryAmount < 0) {
      return res.status(400).json({ error: 'O valor de entrada não pode ser negativo.' });
    }
    if (parsedEntryAmount >= finalAmount && paymentConditionType === 'entrada_parcelas') {
      return res.status(400).json({ error: 'O valor de entrada não pode ser maior ou igual ao total do contrato em condição com parcelas.' });
    }

    // Generate installments calculation
    interface InstallmentPlan {
      installmentNumber: number;
      totalInstallments: number;
      identifier: string;
      isEntry: boolean;
      dueDate: string;
      originalAmount: number;
    }

    const plan: InstallmentPlan[] = [];

    if (customInstallments && Array.isArray(customInstallments) && customInstallments.length > 0) {
      // Validate user customized installments
      let sumCustom = 0;
      customInstallments.forEach((ci: any, idx: number) => {
        const amt = roundMoney(ci.amount);
        if (amt <= 0) throw new Error(`O valor da parcela ${idx + 1} deve ser maior que zero.`);
        if (!ci.dueDate) throw new Error(`A data de vencimento da parcela ${idx + 1} é obrigatória.`);
        sumCustom = roundMoney(sumCustom + amt);
        plan.push({
          installmentNumber: ci.installmentNumber || idx + 1,
          totalInstallments: customInstallments.length,
          identifier: ci.isEntry ? `${contract.number}-ENTRADA` : `${contract.number}-P${String(ci.installmentNumber || idx + 1).padStart(2, '0')}/${String(customInstallments.length).padStart(2, '0')}`,
          isEntry: Boolean(ci.isEntry),
          dueDate: ci.dueDate,
          originalAmount: amt
        });
      });

      if (roundMoney(sumCustom) !== finalAmount) {
        return res.status(400).json({
          error: `A soma das parcelas (R$ ${sumCustom.toFixed(2)}) diverge do valor final do contrato (R$ ${finalAmount.toFixed(2)}).`,
          divergence: roundMoney(sumCustom - finalAmount)
        });
      }
    } else {
      // Automatic calculation with cent correction in the last installment
      if (paymentConditionType === 'a_vista') {
        plan.push({
          installmentNumber: 1,
          totalInstallments: 1,
          identifier: `${contract.number}-P01/01`,
          isEntry: false,
          dueDate: firstDueDate,
          originalAmount: finalAmount
        });
      } else if (paymentConditionType === 'entrada_parcelas') {
        const totalParcelas = numInstallments + 1;
        // 1. Entry
        plan.push({
          installmentNumber: 1,
          totalInstallments: totalParcelas,
          identifier: `${contract.number}-ENTRADA`,
          isEntry: true,
          dueDate: entryDate,
          originalAmount: parsedEntryAmount
        });

        // 2. Remaining balance split into numInstallments
        const remainingBalanceCents = toCents(finalAmount) - toCents(parsedEntryAmount);
        const baseInstallmentCents = Math.floor(remainingBalanceCents / numInstallments);
        let centsAccumulated = 0;

        for (let i = 1; i <= numInstallments; i++) {
          const installmentIndex = i + 1;
          const isLast = i === numInstallments;
          const instAmountCents = isLast
            ? (remainingBalanceCents - centsAccumulated)
            : baseInstallmentCents;
          centsAccumulated += instAmountCents;

          // Compute monthly due dates
          const baseDate = new Date(firstDueDate + 'T00:00:00');
          baseDate.setMonth(baseDate.getMonth() + (i - 1));
          const dueDateStr = baseDate.toISOString().split('T')[0];

          plan.push({
            installmentNumber: installmentIndex,
            totalInstallments: totalParcelas,
            identifier: `${contract.number}-P${String(installmentIndex).padStart(2, '0')}/${String(totalParcelas).padStart(2, '0')}`,
            isEntry: false,
            dueDate: dueDateStr,
            originalAmount: fromCents(instAmountCents)
          });
        }
      } else {
        // 'parcelado' simple
        const totalCents = toCents(finalAmount);
        const baseInstallmentCents = Math.floor(totalCents / numInstallments);
        let centsAccumulated = 0;

        for (let i = 1; i <= numInstallments; i++) {
          const isLast = i === numInstallments;
          const instAmountCents = isLast
            ? (totalCents - centsAccumulated)
            : baseInstallmentCents;
          centsAccumulated += instAmountCents;

          const baseDate = new Date(firstDueDate + 'T00:00:00');
          baseDate.setMonth(baseDate.getMonth() + (i - 1));
          const dueDateStr = baseDate.toISOString().split('T')[0];

          plan.push({
            installmentNumber: i,
            totalInstallments: numInstallments,
            identifier: `${contract.number}-P${String(i).padStart(2, '0')}/${String(numInstallments).padStart(2, '0')}`,
            isEntry: false,
            dueDate: dueDateStr,
            originalAmount: fromCents(instAmountCents)
          });
        }
      }
    }

    // Safety verify: sum of installments MUST equal finalAmount
    const totalPlanAmount = roundMoney(plan.reduce((sum, p) => sum + p.originalAmount, 0));
    if (totalPlanAmount !== finalAmount) {
      return res.status(400).json({
        error: `Erro de cálculo: a soma das parcelas (R$ ${totalPlanAmount}) não coincide com o valor do contrato (R$ ${finalAmount}).`
      });
    }

    const { code, sequence, year } = generateNextReceivableCode();
    const receivableId = randomUUID();
    const now = new Date().toISOString();

    const tx = db.transaction(() => {
      // 1. Insert main receivable
      db.prepare(`
        INSERT INTO financial_receivables (
          id, code, sequenceNumber, year, contractId, proposalId, proposalNumber, contractNumber,
          clientId, clientSnapshot, eventName, eventStartDate, eventEndDate,
          proposalAmount, contractAmount, discountAmount, finalAmount,
          paymentMethod, paymentTerms, paymentConditionType, installmentsCount,
          entryAmount, entryDate, firstDueDate, intervalDays, destinationAccountId,
          status, totalReceived, balance, notes, organizationId, createdBy, isDeleted, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
      `).run(
        receivableId,
        code,
        sequence,
        year,
        contract.id,
        contract.proposalId,
        contract.proposalNumber,
        contract.number,
        contract.clientSnapshot?.id || proposal.clientId || 'cli-1',
        typeof contract.clientSnapshot === 'string' ? contract.clientSnapshot : JSON.stringify(contract.clientSnapshot),
        event.name || proposal.eventName || 'Evento',
        event.startDate || proposal.eventStartDate || null,
        event.endDate || proposal.eventEndDate || null,
        roundMoney(proposal.subtotal || finalAmount),
        roundMoney(finalAmount),
        roundMoney(proposal.discountAmount || 0),
        finalAmount,
        paymentMethod,
        paymentTerms,
        paymentConditionType,
        plan.length,
        parsedEntryAmount,
        parsedEntryAmount > 0 ? entryDate : null,
        firstDueDate,
        intervalDays,
        destinationAccountId,
        'pending',
        0,
        finalAmount,
        notes,
        'default',
        performedBy,
        now,
        now
      );

      // 2. Insert installments
      const insertInst = db.prepare(`
        INSERT INTO financial_receivable_installments (
          id, receivableId, installmentNumber, totalInstallments, identifier,
          isEntry, dueDate, originalAmount, receivedAmount, balance, status,
          paymentMethod, destinationAccountId, notes, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'pending', ?, ?, ?, ?, ?)
      `);

      for (const p of plan) {
        insertInst.run(
          randomUUID(),
          receivableId,
          p.installmentNumber,
          p.totalInstallments,
          p.identifier,
          p.isEntry ? 1 : 0,
          p.dueDate,
          p.originalAmount,
          p.originalAmount,
          paymentMethod,
          destinationAccountId,
          p.isEntry ? 'Entrada contratual' : notes,
          now,
          now
        );
      }

      // 3. Update contract financialReleaseStatus to 'released'
      db.prepare(`
        UPDATE contracts
        SET financialReleaseStatus = 'released',
            financialReleasedAt = ?,
            financialReleasedBy = ?,
            updatedAt = ?
        WHERE id = ?
      `).run(now, performedBy, now, contract.id);

      // 4. Record status history in contract
      db.prepare(`
        INSERT INTO contract_status_history (id, contractId, previousStatus, newStatus, action, details, performedBy, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        randomUUID(),
        contract.id,
        contract.status,
        contract.status,
        'Liberação Financeira',
        `Financeiro gerado com sucesso (${code}). ${plan.length} parcela(s) totalizando R$ ${finalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
        performedBy,
        now
      );

      // 5. Record financial audit history
      db.prepare(`
        INSERT INTO financial_history (id, entityType, entityId, action, newValue, reason, performedBy, createdAt)
        VALUES (?, 'receivable', ?, 'Criação do Faturamento', ?, 'Geração de contas a receber pelo Contrato ' || ?, ?, ?)
      `).run(
        randomUUID(),
        receivableId,
        JSON.stringify({ code, finalAmount, installmentsCount: plan.length, paymentConditionType }),
        contract.number,
        performedBy,
        now
      );
    });

    tx();

    res.json({
      success: true,
      message: 'Financeiro gerado com sucesso.',
      receivableId,
      code,
      installmentsCount: plan.length,
      finalAmount
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao gerar financeiro do contrato: ' + err.message });
  }
});

// POST Manual Receivable Entry (not from contract)
router.post('/receivables/manual', (req, res) => {
  try {
    const {
      clientId,
      eventName,
      description = 'Receita Avulsa',
      amount,
      dueDate = new Date().toISOString().split('T')[0],
      paymentMethod = 'Pix',
      destinationAccountId = 'acc-default-itau',
      notes = '',
      performedBy = 'Administrador'
    } = req.body;

    const val = roundMoney(amount);
    if (val <= 0) return res.status(400).json({ error: 'O valor deve ser maior que zero.' });

    let clientSnapshot = {};
    if (clientId) {
      const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(clientId);
      if (client) clientSnapshot = client;
    }

    const { code, sequence, year } = generateNextReceivableCode();
    const receivableId = randomUUID();
    const instId = randomUUID();
    const now = new Date().toISOString();

    const tx = db.transaction(() => {
      db.prepare(`
        INSERT INTO financial_receivables (
          id, code, sequenceNumber, year, contractId, proposalId, proposalNumber, contractNumber,
          clientId, clientSnapshot, eventName, proposalAmount, contractAmount, discountAmount, finalAmount,
          paymentMethod, paymentTerms, paymentConditionType, installmentsCount,
          firstDueDate, intervalDays, destinationAccountId, status, totalReceived, balance,
          notes, organizationId, createdBy, isDeleted, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, NULL, NULL, NULL, NULL, ?, ?, ?, ?, ?, 0, ?, ?, 'À vista', 'a_vista', 1, ?, 30, ?, 'pending', 0, ?, ?, 'default', ?, 0, ?, ?)
      `).run(
        receivableId, code, sequence, year,
        clientId || 'cli-manual',
        JSON.stringify(clientSnapshot),
        eventName || 'Receita Avulsa',
        val, val, val,
        paymentMethod,
        dueDate,
        destinationAccountId,
        val,
        notes || description,
        performedBy,
        now, now
      );

      db.prepare(`
        INSERT INTO financial_receivable_installments (
          id, receivableId, installmentNumber, totalInstallments, identifier,
          isEntry, dueDate, originalAmount, receivedAmount, balance, status,
          paymentMethod, destinationAccountId, notes, createdAt, updatedAt
        ) VALUES (?, ?, 1, 1, ?, 0, ?, ?, 0, ?, 'pending', ?, ?, ?, ?, ?)
      `).run(
        instId, receivableId, `${code}-P01/01`, dueDate, val, val, paymentMethod, destinationAccountId, description, now, now
      );

      db.prepare(`
        INSERT INTO financial_history (id, entityType, entityId, action, newValue, reason, performedBy, createdAt)
        VALUES (?, 'receivable', ?, 'Lançamento Manual', ?, 'Receita avulsa cadastrada', ?, ?)
      `).run(
        randomUUID(), receivableId, JSON.stringify({ code, val, eventName, description }), performedBy, now
      );
    });

    tx();

    res.json({ success: true, message: 'Lançamento a receber cadastrado.', receivableId, code });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao cadastrar receita manual: ' + err.message });
  }
});

// POST Register Partial or Total Receipt on an Installment
router.post('/receivables/:id/installments/:instId/receipt', (req, res) => {
  try {
    const receivable: any = db.prepare('SELECT * FROM financial_receivables WHERE id = ? AND isDeleted = 0').get(req.params.id);
    if (!receivable) return res.status(404).json({ error: 'Título a receber não encontrado.' });

    const installment: any = db.prepare('SELECT * FROM financial_receivable_installments WHERE id = ? AND receivableId = ?').get(req.params.instId, receivable.id);
    if (!installment) return res.status(404).json({ error: 'Parcela não encontrada.' });

    if (installment.status === 'paid') {
      return res.status(400).json({ error: 'Esta parcela já foi totalmente recebida.' });
    }
    if (installment.status === 'cancelled') {
      return res.status(400).json({ error: 'Não é possível registrar recebimento em parcela cancelada.' });
    }

    const {
      amount,
      receivedDate = new Date().toISOString().split('T')[0],
      paymentMethod = installment.paymentMethod || 'Pix',
      destinationAccountId = installment.destinationAccountId || 'acc-default-itau',
      transactionRef = '',
      proofDocumentPath = '',
      proofDocumentName = '',
      notes = '',
      performedBy = 'Administrador',
      forceOverpayment = false
    } = req.body;

    const receiptAmount = roundMoney(amount);
    if (receiptAmount <= 0) {
      return res.status(400).json({ error: 'O valor do recebimento deve ser maior que zero.' });
    }

    const currentBalance = roundMoney(installment.balance);
    if (receiptAmount > currentBalance && !forceOverpayment) {
      return res.status(400).json({
        error: `O valor informado (R$ ${receiptAmount.toFixed(2)}) ultrapassa o saldo devedor da parcela (R$ ${currentBalance.toFixed(2)}).`,
        requiresAuthorization: true,
        currentBalance
      });
    }

    const receiptId = randomUUID();
    const now = new Date().toISOString();
    const year = new Date().getFullYear();

    // Generate internal receipt number
    const countReceipts: any = db.prepare('SELECT COUNT(*) as count FROM financial_receipts').get();
    const receiptNumber = `LIQ-${year}-${String((countReceipts?.count || 0) + 1).padStart(5, '0')}`;

    const newReceivedInst = roundMoney(installment.receivedAmount + receiptAmount);
    const newBalanceInst = roundMoney(Math.max(0, installment.originalAmount - newReceivedInst));
    const newStatusInst = newBalanceInst <= 0 ? 'paid' : 'partially_paid';

    const tx = db.transaction(() => {
      // 1. Insert receipt record
      db.prepare(`
        INSERT INTO financial_receipts (
          id, receivableId, installmentId, receiptNumber, receivedDate, amount,
          paymentMethod, destinationAccountId, transactionRef, proofDocumentPath,
          proofDocumentName, notes, isReversed, receivedBy, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
      `).run(
        receiptId, receivable.id, installment.id, receiptNumber, receivedDate, receiptAmount,
        paymentMethod, destinationAccountId, transactionRef, proofDocumentPath, proofDocumentName,
        notes, performedBy, now
      );

      // 2. Update installment
      db.prepare(`
        UPDATE financial_receivable_installments
        SET receivedAmount = ?, balance = ?, status = ?, updatedAt = ?
        WHERE id = ?
      `).run(newReceivedInst, newBalanceInst, newStatusInst, now, installment.id);

      // 3. Recalculate main receivable totalReceived and balance
      const totals: any = db.prepare(`
        SELECT SUM(receivedAmount) as totalReceived, SUM(balance) as totalBalance
        FROM financial_receivable_installments
        WHERE receivableId = ? AND status != 'cancelled'
      `).get(receivable.id);

      const totalReceived = roundMoney(totals?.totalReceived || 0);
      const totalBalance = roundMoney(totals?.totalBalance || 0);
      const newStatusRec = totalBalance <= 0 ? 'paid' : (totalReceived > 0 ? 'partially_paid' : 'pending');

      db.prepare(`
        UPDATE financial_receivables
        SET totalReceived = ?, balance = ?, status = ?, updatedAt = ?
        WHERE id = ?
      `).run(totalReceived, totalBalance, newStatusRec, now, receivable.id);

      // 4. Record in audit history
      db.prepare(`
        INSERT INTO financial_history (id, entityType, entityId, action, previousValue, newValue, notes, performedBy, createdAt)
        VALUES (?, 'receipt', ?, 'Registro de Recebimento', ?, ?, ?, ?, ?)
      `).run(
        randomUUID(),
        receiptId,
        JSON.stringify({ balance: currentBalance }),
        JSON.stringify({ receiptAmount, newBalance: newBalanceInst, status: newStatusInst }),
        `Recebimento de R$ ${receiptAmount.toFixed(2)} registrado na parcela ${installment.identifier}.`,
        performedBy,
        now
      );
    });

    tx();

    res.json({
      success: true,
      message: newStatusInst === 'paid' ? 'Parcela quitada com sucesso!' : 'Recebimento parcial registrado com sucesso.',
      receiptId,
      receiptNumber,
      newBalance: newBalanceInst,
      status: newStatusInst
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao registrar recebimento: ' + err.message });
  }
});

// POST Reverse (Estornar) Receipt with Reason and Audit Trail
router.post('/receivables/:id/receipts/:recId/reverse', (req, res) => {
  try {
    const receivable: any = db.prepare('SELECT * FROM financial_receivables WHERE id = ? AND isDeleted = 0').get(req.params.id);
    if (!receivable) return res.status(404).json({ error: 'Título não encontrado.' });

    const receipt: any = db.prepare('SELECT * FROM financial_receipts WHERE id = ? AND receivableId = ?').get(req.params.recId, receivable.id);
    if (!receipt) return res.status(404).json({ error: 'Recebimento não encontrado.' });

    if (receipt.isReversed) {
      return res.status(400).json({ error: 'Este recebimento já foi estornado anteriormente.' });
    }

    const { reason, performedBy = 'Administrador' } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'É obrigatório informar o motivo do estorno.' });
    }

    const installment: any = db.prepare('SELECT * FROM financial_receivable_installments WHERE id = ?').get(receipt.installmentId);
    if (!installment) return res.status(404).json({ error: 'Parcela vinculada não encontrada.' });

    const now = new Date().toISOString();
    const today = now.split('T')[0];
    const amount = roundMoney(receipt.amount);

    const tx = db.transaction(() => {
      // 1. Mark receipt as reversed (do NOT delete physically)
      db.prepare(`
        UPDATE financial_receipts
        SET isReversed = 1, reversedAt = ?, reversedBy = ?, reversalReason = ?
        WHERE id = ?
      `).run(now, performedBy, reason.trim(), receipt.id);

      // 2. Recalculate installment balance and receivedAmount
      const activeReceiptsSum: any = db.prepare(`
        SELECT SUM(amount) as total
        FROM financial_receipts
        WHERE installmentId = ? AND isReversed = 0
      `).get(installment.id);

      const newReceivedInst = roundMoney(activeReceiptsSum?.total || 0);
      const newBalanceInst = roundMoney(Math.max(0, installment.originalAmount - newReceivedInst));
      let newStatusInst = newBalanceInst <= 0 ? 'paid' : (newReceivedInst > 0 ? 'partially_paid' : 'pending');
      if (newStatusInst === 'pending' && installment.dueDate < today) {
        newStatusInst = 'overdue';
      }

      db.prepare(`
        UPDATE financial_receivable_installments
        SET receivedAmount = ?, balance = ?, status = ?, updatedAt = ?
        WHERE id = ?
      `).run(newReceivedInst, newBalanceInst, newStatusInst, now, installment.id);

      // 3. Recalculate main receivable
      const totals: any = db.prepare(`
        SELECT SUM(receivedAmount) as totalReceived, SUM(balance) as totalBalance
        FROM financial_receivable_installments
        WHERE receivableId = ? AND status != 'cancelled'
      `).get(receivable.id);

      const totalReceived = roundMoney(totals?.totalReceived || 0);
      const totalBalance = roundMoney(totals?.totalBalance || 0);
      let newStatusRec = totalBalance <= 0 ? 'paid' : (totalReceived > 0 ? 'partially_paid' : 'pending');

      db.prepare(`
        UPDATE financial_receivables
        SET totalReceived = ?, balance = ?, status = ?, updatedAt = ?
        WHERE id = ?
      `).run(totalReceived, totalBalance, newStatusRec, now, receivable.id);

      // 4. Record in audit history
      db.prepare(`
        INSERT INTO financial_history (id, entityType, entityId, action, previousValue, newValue, reason, performedBy, createdAt)
        VALUES (?, 'receipt', ?, 'Estorno de Recebimento', ?, ?, ?, ?, ?)
      `).run(
        randomUUID(),
        receipt.id,
        JSON.stringify({ receivedAmount: installment.receivedAmount, balance: installment.balance }),
        JSON.stringify({ newReceived: newReceivedInst, newBalance: newBalanceInst, status: newStatusInst }),
        reason.trim(),
        performedBy,
        now
      );
    });

    tx();

    res.json({ success: true, message: 'Estorno realizado com sucesso. Histórico mantido e saldos recalculados.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao estornar recebimento: ' + err.message });
  }
});

// PATCH Edit Installment Due Date or Notes
router.patch('/receivables/installments/:instId', (req, res) => {
  try {
    const inst: any = db.prepare('SELECT * FROM financial_receivable_installments WHERE id = ?').get(req.params.instId);
    if (!inst) return res.status(404).json({ error: 'Parcela não encontrada.' });

    const { dueDate, notes, performedBy = 'Administrador', reason = 'Ajuste de vencimento' } = req.body;
    if (!dueDate) return res.status(400).json({ error: 'A data de vencimento não pode ser vazia.' });

    const now = new Date().toISOString();
    const today = now.split('T')[0];
    let newStatus = inst.status;
    if (newStatus !== 'paid' && newStatus !== 'cancelled') {
      newStatus = dueDate < today ? 'overdue' : (inst.receivedAmount > 0 ? 'partially_paid' : 'pending');
    }

    const tx = db.transaction(() => {
      db.prepare(`
        UPDATE financial_receivable_installments
        SET dueDate = ?, notes = COALESCE(?, notes), status = ?, updatedAt = ?
        WHERE id = ?
      `).run(dueDate, notes || null, newStatus, now, inst.id);

      db.prepare(`
        INSERT INTO financial_history (id, entityType, entityId, action, previousValue, newValue, reason, performedBy, createdAt)
        VALUES (?, 'receivable', ?, 'Alteração de Vencimento', ?, ?, ?, ?, ?)
      `).run(
        randomUUID(),
        inst.receivableId,
        JSON.stringify({ dueDate: inst.dueDate }),
        JSON.stringify({ dueDate, status: newStatus }),
        reason,
        performedBy,
        now
      );
    });

    tx();

    res.json({ success: true, message: 'Vencimento da parcela atualizado com sucesso.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao atualizar parcela: ' + err.message });
  }
});

// POST Cancel Installment
router.post('/receivables/installments/:instId/cancel', (req, res) => {
  try {
    const inst: any = db.prepare('SELECT * FROM financial_receivable_installments WHERE id = ?').get(req.params.instId);
    if (!inst) return res.status(404).json({ error: 'Parcela não encontrada.' });

    if (inst.receivedAmount > 0) {
      return res.status(400).json({ error: 'Não é possível cancelar parcela com recebimentos registrados. Estorne os recebimentos primeiro.' });
    }

    const { reason, performedBy = 'Administrador' } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'É obrigatório informar o motivo do cancelamento.' });
    }

    const now = new Date().toISOString();

    const tx = db.transaction(() => {
      db.prepare(`
        UPDATE financial_receivable_installments
        SET status = 'cancelled', balance = 0, updatedAt = ?
        WHERE id = ?
      `).run(now, inst.id);

      // Recalculate main receivable
      const totals: any = db.prepare(`
        SELECT SUM(receivedAmount) as totalReceived, SUM(balance) as totalBalance
        FROM financial_receivable_installments
        WHERE receivableId = ? AND status != 'cancelled'
      `).get(inst.receivableId);

      db.prepare(`
        UPDATE financial_receivables
        SET totalReceived = ?, balance = ?, updatedAt = ?
        WHERE id = ?
      `).run(roundMoney(totals?.totalReceived || 0), roundMoney(totals?.totalBalance || 0), now, inst.receivableId);

      db.prepare(`
        INSERT INTO financial_history (id, entityType, entityId, action, reason, performedBy, createdAt)
        VALUES (?, 'receivable', ?, 'Cancelamento de Parcela', ?, ?, ?)
      `).run(
        randomUUID(), inst.receivableId, `Parcela ${inst.identifier} cancelada. Motivo: ${reason}`, performedBy, now
      );
    });

    tx();

    res.json({ success: true, message: 'Parcela cancelada com sucesso.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao cancelar parcela: ' + err.message });
  }
});

// ==========================================================
// 4. CONTAS A PAGAR (DESPESAS OPERACIONAIS)
// ==========================================================

// List payables with filters
router.get('/payables', (req, res) => {
  try {
    const { search, status, categoryId, eventName, supplierName, dueDateFrom, dueDateTo } = req.query;

    let query = `
      SELECT p.*
      FROM financial_payables p
      WHERE p.isDeleted = 0
    `;
    const params: any[] = [];

    if (status) {
      query += ` AND p.status = ?`;
      params.push(String(status));
    }
    if (categoryId) {
      query += ` AND p.categoryId = ?`;
      params.push(String(categoryId));
    }
    if (eventName) {
      query += ` AND p.eventName LIKE ?`;
      params.push(`%${String(eventName).trim()}%`);
    }
    if (supplierName) {
      query += ` AND p.supplierName LIKE ?`;
      params.push(`%${String(supplierName).trim()}%`);
    }
    if (search) {
      const term = `%${String(search).trim()}%`;
      query += ` AND (
        p.code LIKE ?
        OR p.description LIKE ?
        OR p.supplierName LIKE ?
        OR p.categoryName LIKE ?
        OR p.eventName LIKE ?
      )`;
      params.push(term, term, term, term, term);
    }

    query += ` ORDER BY p.year DESC, p.sequenceNumber DESC`;

    const rows = db.prepare(query).all(...params) as any[];
    const today = new Date().toISOString().split('T')[0];

    const payables = rows.map(p => {
      const installments = db.prepare(`
        SELECT * FROM financial_payable_installments
        WHERE payableId = ?
        ORDER BY installmentNumber ASC
      `).all(p.id) as any[];

      const updatedInstallments = installments.map(inst => {
        let currentStatus = inst.status;
        if (currentStatus === 'pending' && inst.dueDate < today) {
          currentStatus = 'overdue';
        }
        return { ...inst, status: currentStatus };
      });

      let overallStatus = p.status;
      if (overallStatus !== 'cancelled' && overallStatus !== 'paid') {
        if (updatedInstallments.some(i => i.status === 'overdue')) overallStatus = 'overdue';
      }

      return {
        ...p,
        status: overallStatus,
        installments: updatedInstallments
      };
    });

    res.json(payables);
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao listar contas a pagar: ' + err.message });
  }
});

// GET single payable
router.get('/payables/:id', (req, res) => {
  try {
    const row: any = db.prepare('SELECT * FROM financial_payables WHERE id = ? AND isDeleted = 0').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Despesa não encontrada.' });

    const installments = (db.prepare(`
      SELECT * FROM financial_payable_installments
      WHERE payableId = ?
      ORDER BY installmentNumber ASC
    `).all(row.id) as any[]).map(inst => {
      const payments = db.prepare(`
        SELECT py.*, a.name as accountName
        FROM financial_payments py
        LEFT JOIN financial_accounts a ON py.sourceAccountId = a.id
        WHERE py.installmentId = ?
        ORDER BY py.paymentDate DESC
      `).all(inst.id);
      return { ...inst, payments };
    });

    const history = db.prepare(`
      SELECT * FROM financial_history
      WHERE entityType = 'payable' AND entityId = ?
      ORDER BY createdAt DESC
    `).all(row.id);

    res.json({ ...row, installments, history });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao buscar despesa: ' + err.message });
  }
});

// POST Create Payable Expense (à vista, parcelada ou recorrente)
router.post('/payables', (req, res) => {
  try {
    const {
      description,
      supplierName,
      supplierDocument = '',
      categoryId,
      eventName = '',
      proposalId = null,
      contractId = null,
      expenseDate = new Date().toISOString().split('T')[0],
      dueDate = new Date().toISOString().split('T')[0],
      amount,
      paymentType = 'a_vista', // 'a_vista' | 'parcelado' | 'recorrente'
      installmentsCount = 1,
      intervalDays = 30,
      paymentMethod = 'Pix',
      sourceAccountId = 'acc-default-itau',
      notes = '',
      attachmentPath = '',
      attachmentName = '',
      performedBy = 'Administrador'
    } = req.body;

    if (!description || !description.trim()) {
      return res.status(400).json({ error: 'A descrição da despesa é obrigatória.' });
    }
    if (!supplierName || !supplierName.trim()) {
      return res.status(400).json({ error: 'O fornecedor ou profissional é obrigatório.' });
    }
    if (!categoryId) {
      return res.status(400).json({ error: 'A categoria da despesa é obrigatória.' });
    }

    const totalAmount = roundMoney(amount);
    if (totalAmount <= 0) {
      return res.status(400).json({ error: 'O valor da despesa deve ser maior que zero.' });
    }

    const cat: any = db.prepare('SELECT name, color FROM financial_categories WHERE id = ?').get(categoryId);
    const categoryName = cat?.name || 'Geral';

    const numInstallments = Math.max(1, parseInt(String(installmentsCount), 10) || 1);
    const { code, sequence, year } = generateNextPayableCode();
    const payableId = randomUUID();
    const now = new Date().toISOString();

    // Generate installment plan
    interface PayInstallmentPlan {
      num: number;
      total: number;
      identifier: string;
      dueDate: string;
      amount: number;
    }

    const plan: PayInstallmentPlan[] = [];

    if (paymentType === 'a_vista') {
      plan.push({
        num: 1,
        total: 1,
        identifier: `${code}-P01/01`,
        dueDate,
        amount: totalAmount
      });
    } else if (paymentType === 'parcelado') {
      const totalCents = toCents(totalAmount);
      const baseCents = Math.floor(totalCents / numInstallments);
      let centsAccum = 0;

      for (let i = 1; i <= numInstallments; i++) {
        const isLast = i === numInstallments;
        const instCents = isLast ? (totalCents - centsAccum) : baseCents;
        centsAccum += instCents;

        const baseDate = new Date(dueDate + 'T00:00:00');
        baseDate.setMonth(baseDate.getMonth() + (i - 1));
        const dateStr = baseDate.toISOString().split('T')[0];

        plan.push({
          num: i,
          total: numInstallments,
          identifier: `${code}-P${String(i).padStart(2, '0')}/${String(numInstallments).padStart(2, '0')}`,
          dueDate: dateStr,
          amount: fromCents(instCents)
        });
      }
    } else {
      // 'recorrente': each recurrence is a full instance of totalAmount
      for (let i = 1; i <= numInstallments; i++) {
        const baseDate = new Date(dueDate + 'T00:00:00');
        baseDate.setMonth(baseDate.getMonth() + (i - 1));
        const dateStr = baseDate.toISOString().split('T')[0];

        plan.push({
          num: i,
          total: numInstallments,
          identifier: `${code}-REC${String(i).padStart(2, '0')}/${String(numInstallments).padStart(2, '0')}`,
          dueDate: dateStr,
          amount: totalAmount
        });
      }
    }

    const finalPayableTotal = paymentType === 'recorrente' ? roundMoney(totalAmount * numInstallments) : totalAmount;

    const tx = db.transaction(() => {
      db.prepare(`
        INSERT INTO financial_payables (
          id, code, sequenceNumber, year, description, supplierName, supplierDocument,
          categoryId, categoryName, eventName, proposalId, contractId, expenseDate,
          dueDate, amount, paidAmount, balance, paymentType, installmentsCount, intervalDays,
          paymentMethod, sourceAccountId, status, notes, attachmentPath, attachmentName,
          organizationId, createdBy, isDeleted, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, 'default', ?, 0, ?, ?)
      `).run(
        payableId, code, sequence, year, description.trim(), supplierName.trim(), supplierDocument.trim(),
        categoryId, categoryName, eventName.trim() || null, proposalId || null, contractId || null,
        expenseDate, dueDate, finalPayableTotal, finalPayableTotal, paymentType, plan.length, intervalDays,
        paymentMethod, sourceAccountId, notes, attachmentPath, attachmentName, performedBy, now, now
      );

      const insertInst = db.prepare(`
        INSERT INTO financial_payable_installments (
          id, payableId, installmentNumber, totalInstallments, identifier,
          dueDate, originalAmount, paidAmount, balance, status, notes, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 'pending', ?, ?, ?)
      `);

      for (const p of plan) {
        insertInst.run(
          randomUUID(), payableId, p.num, p.total, p.identifier, p.dueDate, p.amount, p.amount, notes, now, now
        );
      }

      db.prepare(`
        INSERT INTO financial_history (id, entityType, entityId, action, newValue, reason, performedBy, createdAt)
        VALUES (?, 'payable', ?, 'Cadastro de Despesa', ?, 'Nova despesa operacional cadastrada', ?, ?)
      `).run(
        randomUUID(), payableId, JSON.stringify({ code, finalPayableTotal, installmentsCount: plan.length, supplierName }), performedBy, now
      );
    });

    tx();

    res.json({
      success: true,
      message: 'Despesa cadastrada com sucesso.',
      payableId,
      code,
      totalAmount: finalPayableTotal,
      installmentsCount: plan.length
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao cadastrar despesa: ' + err.message });
  }
});

// POST Duplicate Payable
router.post('/payables/:id/duplicate', (req, res) => {
  try {
    const original: any = db.prepare('SELECT * FROM financial_payables WHERE id = ? AND isDeleted = 0').get(req.params.id);
    if (!original) return res.status(404).json({ error: 'Despesa não encontrada para duplicar.' });

    const { code, sequence, year } = generateNextPayableCode();
    const newId = randomUUID();
    const now = new Date().toISOString();
    const today = now.split('T')[0];

    const tx = db.transaction(() => {
      db.prepare(`
        INSERT INTO financial_payables (
          id, code, sequenceNumber, year, description, supplierName, supplierDocument,
          categoryId, categoryName, eventName, proposalId, contractId, expenseDate,
          dueDate, amount, paidAmount, balance, paymentType, installmentsCount, intervalDays,
          paymentMethod, sourceAccountId, status, notes, organizationId, createdBy, isDeleted, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'a_vista', 1, 30, ?, ?, 'pending', ?, 'default', ?, 0, ?, ?)
      `).run(
        newId, code, sequence, year, `${original.description} (Cópia)`, original.supplierName, original.supplierDocument,
        original.categoryId, original.categoryName, original.eventName, original.proposalId, original.contractId,
        today, today, original.amount, original.amount, original.paymentMethod, original.sourceAccountId,
        original.notes, 'Administrador', now, now
      );

      db.prepare(`
        INSERT INTO financial_payable_installments (
          id, payableId, installmentNumber, totalInstallments, identifier,
          dueDate, originalAmount, paidAmount, balance, status, notes, createdAt, updatedAt
        ) VALUES (?, ?, 1, 1, ?, ?, ?, 0, ?, 'pending', ?, ?, ?)
      `).run(
        randomUUID(), newId, `${code}-P01/01`, today, original.amount, original.amount, original.notes, now, now
      );
    });

    tx();

    res.json({ success: true, message: 'Despesa duplicada com sucesso.', payableId: newId, code });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao duplicar despesa: ' + err.message });
  }
});

// POST Register Payment of a Payable Installment
router.post('/payables/:id/installments/:instId/payment', (req, res) => {
  try {
    const payable: any = db.prepare('SELECT * FROM financial_payables WHERE id = ? AND isDeleted = 0').get(req.params.id);
    if (!payable) return res.status(404).json({ error: 'Despesa não encontrada.' });

    const installment: any = db.prepare('SELECT * FROM financial_payable_installments WHERE id = ? AND payableId = ?').get(req.params.instId, payable.id);
    if (!installment) return res.status(404).json({ error: 'Parcela não encontrada.' });

    if (installment.status === 'paid') return res.status(400).json({ error: 'Esta parcela já foi paga.' });
    if (installment.status === 'cancelled') return res.status(400).json({ error: 'Não é possível pagar parcela cancelada.' });

    const {
      amount,
      paymentDate = new Date().toISOString().split('T')[0],
      paymentMethod = payable.paymentMethod || 'Pix',
      sourceAccountId = payable.sourceAccountId || 'acc-default-itau',
      transactionRef = '',
      proofDocumentPath = '',
      proofDocumentName = '',
      notes = '',
      performedBy = 'Administrador'
    } = req.body;

    const payAmount = roundMoney(amount);
    if (payAmount <= 0) return res.status(400).json({ error: 'O valor do pagamento deve ser maior que zero.' });

    const curBalance = roundMoney(installment.balance);
    if (payAmount > curBalance) {
      return res.status(400).json({ error: `O valor (R$ ${payAmount.toFixed(2)}) ultrapassa o saldo da parcela (R$ ${curBalance.toFixed(2)}).` });
    }

    const paymentId = randomUUID();
    const now = new Date().toISOString();

    const newPaidInst = roundMoney(installment.paidAmount + payAmount);
    const newBalanceInst = roundMoney(Math.max(0, installment.originalAmount - newPaidInst));
    const newStatusInst = newBalanceInst <= 0 ? 'paid' : 'partially_paid';

    const tx = db.transaction(() => {
      db.prepare(`
        INSERT INTO financial_payments (
          id, payableId, installmentId, paymentDate, amount, paymentMethod,
          sourceAccountId, transactionRef, proofDocumentPath, proofDocumentName, notes,
          isReversed, paidBy, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
      `).run(
        paymentId, payable.id, installment.id, paymentDate, payAmount, paymentMethod,
        sourceAccountId, transactionRef, proofDocumentPath, proofDocumentName, notes,
        performedBy, now
      );

      db.prepare(`
        UPDATE financial_payable_installments
        SET paidAmount = ?, balance = ?, status = ?, updatedAt = ?
        WHERE id = ?
      `).run(newPaidInst, newBalanceInst, newStatusInst, now, installment.id);

      const totals: any = db.prepare(`
        SELECT SUM(paidAmount) as totalPaid, SUM(balance) as totalBalance
        FROM financial_payable_installments
        WHERE payableId = ? AND status != 'cancelled'
      `).get(payable.id);

      const totalPaid = roundMoney(totals?.totalPaid || 0);
      const totalBalance = roundMoney(totals?.totalBalance || 0);
      const newStatusPayable = totalBalance <= 0 ? 'paid' : (totalPaid > 0 ? 'partially_paid' : 'pending');

      db.prepare(`
        UPDATE financial_payables
        SET paidAmount = ?, balance = ?, status = ?, updatedAt = ?
        WHERE id = ?
      `).run(totalPaid, totalBalance, newStatusPayable, now, payable.id);

      db.prepare(`
        INSERT INTO financial_history (id, entityType, entityId, action, notes, performedBy, createdAt)
        VALUES (?, 'payment', ?, 'Registro de Pagamento', ?, ?, ?)
      `).run(
        randomUUID(), paymentId, `Pagamento de R$ ${payAmount.toFixed(2)} efetuado para ${payable.supplierName}.`, performedBy, now
      );
    });

    tx();

    res.json({
      success: true,
      message: newStatusInst === 'paid' ? 'Despesa quitada com sucesso!' : 'Pagamento parcial registrado com sucesso.',
      paymentId,
      newBalance: newBalanceInst,
      status: newStatusInst
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao registrar pagamento: ' + err.message });
  }
});

// POST Reverse (Estornar) Payment
router.post('/payables/:id/payments/:payId/reverse', (req, res) => {
  try {
    const payable: any = db.prepare('SELECT * FROM financial_payables WHERE id = ? AND isDeleted = 0').get(req.params.id);
    if (!payable) return res.status(404).json({ error: 'Despesa não encontrada.' });

    const payment: any = db.prepare('SELECT * FROM financial_payments WHERE id = ? AND payableId = ?').get(req.params.payId, payable.id);
    if (!payment) return res.status(404).json({ error: 'Pagamento não encontrado.' });

    if (payment.isReversed) return res.status(400).json({ error: 'Este pagamento já foi estornado.' });

    const { reason, performedBy = 'Administrador' } = req.body;
    if (!reason || !reason.trim()) return res.status(400).json({ error: 'Informe o motivo do estorno.' });

    const installment: any = db.prepare('SELECT * FROM financial_payable_installments WHERE id = ?').get(payment.installmentId);
    if (!installment) return res.status(404).json({ error: 'Parcela não encontrada.' });

    const now = new Date().toISOString();
    const today = now.split('T')[0];

    const tx = db.transaction(() => {
      db.prepare(`
        UPDATE financial_payments
        SET isReversed = 1, reversedAt = ?, reversedBy = ?, reversalReason = ?
        WHERE id = ?
      `).run(now, performedBy, reason.trim(), payment.id);

      const activeSum: any = db.prepare(`
        SELECT SUM(amount) as total
        FROM financial_payments
        WHERE installmentId = ? AND isReversed = 0
      `).get(installment.id);

      const newPaidInst = roundMoney(activeSum?.total || 0);
      const newBalanceInst = roundMoney(Math.max(0, installment.originalAmount - newPaidInst));
      let newStatusInst = newBalanceInst <= 0 ? 'paid' : (newPaidInst > 0 ? 'partially_paid' : 'pending');
      if (newStatusInst === 'pending' && installment.dueDate < today) newStatusInst = 'overdue';

      db.prepare(`
        UPDATE financial_payable_installments
        SET paidAmount = ?, balance = ?, status = ?, updatedAt = ?
        WHERE id = ?
      `).run(newPaidInst, newBalanceInst, newStatusInst, now, installment.id);

      const totals: any = db.prepare(`
        SELECT SUM(paidAmount) as totalPaid, SUM(balance) as totalBalance
        FROM financial_payable_installments
        WHERE payableId = ? AND status != 'cancelled'
      `).get(payable.id);

      const totalPaid = roundMoney(totals?.totalPaid || 0);
      const totalBalance = roundMoney(totals?.totalBalance || 0);
      let newStatusPay = totalBalance <= 0 ? 'paid' : (totalPaid > 0 ? 'partially_paid' : 'pending');

      db.prepare(`
        UPDATE financial_payables
        SET paidAmount = ?, balance = ?, status = ?, updatedAt = ?
        WHERE id = ?
      `).run(totalPaid, totalBalance, newStatusPay, now, payable.id);

      db.prepare(`
        INSERT INTO financial_history (id, entityType, entityId, action, reason, performedBy, createdAt)
        VALUES (?, 'payment', ?, 'Estorno de Pagamento', ?, ?, ?)
      `).run(
        randomUUID(), payment.id, `Estorno de R$ ${payment.amount}. Motivo: ${reason}`, performedBy, now
      );
    });

    tx();

    res.json({ success: true, message: 'Estorno de pagamento realizado com sucesso.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao estornar pagamento: ' + err.message });
  }
});

// ==========================================================
// 5. RESULTADO FINANCEIRO POR EVENTO
// ==========================================================
router.get('/events-results', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Find all distinct event names from receivables and payables
    const eventNamesRows = db.prepare(`
      SELECT DISTINCT eventName FROM financial_receivables WHERE isDeleted = 0 AND eventName IS NOT NULL AND eventName != ''
      UNION
      SELECT DISTINCT eventName FROM financial_payables WHERE isDeleted = 0 AND eventName IS NOT NULL AND eventName != ''
    `).all() as { eventName: string }[];

    const results = eventNamesRows.map(({ eventName }) => {
      // Receivables aggregation
      const recTotals: any = db.prepare(`
        SELECT
          r.id as recId,
          r.clientId,
          r.clientSnapshot,
          r.proposalNumber,
          r.contractNumber,
          r.contractId,
          r.proposalId,
          SUM(r.contractAmount) as contractAmount,
          SUM(r.finalAmount) as revenueExpected,
          SUM(r.totalReceived) as revenueReceived,
          SUM(r.balance) as revenuePending
        FROM financial_receivables r
        WHERE r.eventName = ? AND r.isDeleted = 0 AND r.status != 'cancelled'
        GROUP BY r.eventName
      `).get(eventName) || {};

      // Overdue revenue
      const overdueRow: any = db.prepare(`
        SELECT SUM(i.balance) as overdue
        FROM financial_receivable_installments i
        JOIN financial_receivables r ON i.receivableId = r.id
        WHERE r.eventName = ? AND r.isDeleted = 0 AND i.status != 'cancelled' AND i.status != 'paid' AND i.dueDate < ?
      `).get(eventName, today) || {};

      // Payables aggregation
      const payTotals: any = db.prepare(`
        SELECT
          SUM(p.amount) as expenseExpected,
          SUM(p.paidAmount) as expensePaid,
          SUM(p.balance) as expensePending
        FROM financial_payables p
        WHERE p.eventName = ? AND p.isDeleted = 0 AND p.status != 'cancelled'
        GROUP BY p.eventName
      `).get(eventName) || {};

      let clientName = 'Cliente';
      let clientDocument = '';
      try {
        if (recTotals.clientSnapshot) {
          const snap = typeof recTotals.clientSnapshot === 'string' ? JSON.parse(recTotals.clientSnapshot) : recTotals.clientSnapshot;
          clientName = snap.tradeName || snap.name || 'Cliente';
          clientDocument = snap.document || '';
        }
      } catch {}

      const revenueExpected = roundMoney(recTotals.revenueExpected || 0);
      const revenueReceived = roundMoney(recTotals.revenueReceived || 0);
      const revenuePending = roundMoney(recTotals.revenuePending || 0);
      const revenueOverdue = roundMoney(overdueRow.overdue || 0);

      const expenseExpected = roundMoney(payTotals.expenseExpected || 0);
      const expensePaid = roundMoney(payTotals.expensePaid || 0);
      const expensePending = roundMoney(payTotals.expensePending || 0);

      const resultExpected = roundMoney(revenueExpected - expenseExpected);
      const resultRealized = roundMoney(revenueReceived - expensePaid);

      // Safe margins against division by zero
      const marginExpectedPercent = revenueExpected > 0 ? roundMoney((resultExpected / revenueExpected) * 100) : 0;
      const marginRealizedPercent = revenueReceived > 0 ? roundMoney((resultRealized / revenueReceived) * 100) : 0;

      let financialStatus: 'lucro' | 'prejuizo' | 'neutro' = 'neutro';
      if (resultRealized > 0) financialStatus = 'lucro';
      else if (resultRealized < 0) financialStatus = 'prejuizo';
      else if (resultExpected < 0) financialStatus = 'prejuizo';

      return {
        eventName,
        clientName,
        clientDocument,
        proposalNumber: recTotals.proposalNumber || '',
        contractNumber: recTotals.contractNumber || '',
        contractId: recTotals.contractId || '',
        proposalId: recTotals.proposalId || '',
        contractAmount: roundMoney(recTotals.contractAmount || revenueExpected),
        revenueExpected,
        revenueReceived,
        revenuePending,
        revenueOverdue,
        expenseExpected,
        expensePaid,
        expensePending,
        resultExpected,
        resultRealized,
        marginExpectedPercent,
        marginRealizedPercent,
        financialStatus
      };
    });

    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao calcular resultados por evento: ' + err.message });
  }
});

// GET Detailed Event Result with Receivables, Payables, Movements, and Document links
router.get('/events-results/:eventName', (req, res) => {
  try {
    const eventName = req.params.eventName;

    const receivables = db.prepare(`
      SELECT r.*
      FROM financial_receivables r
      WHERE r.eventName = ? AND r.isDeleted = 0
    `).all(eventName) as any[];

    const payables = db.prepare(`
      SELECT p.*
      FROM financial_payables p
      WHERE p.eventName = ? AND p.isDeleted = 0
    `).all(eventName) as any[];

    // Document links (proposals, contracts, official receipts)
    const officialReceipts = db.prepare(`
      SELECT d.*
      FROM financial_receipt_documents d
      WHERE d.eventName = ?
      ORDER BY d.createdAt DESC
    `).all(eventName) as any[];

    res.json({
      eventName,
      receivables: receivables.map(r => ({
        ...r,
        clientSnapshot: typeof r.clientSnapshot === 'string' ? JSON.parse(r.clientSnapshot) : r.clientSnapshot,
        installments: db.prepare('SELECT * FROM financial_receivable_installments WHERE receivableId = ? ORDER BY installmentNumber ASC').all(r.id)
      })),
      payables: payables.map(p => ({
        ...p,
        installments: db.prepare('SELECT * FROM financial_payable_installments WHERE payableId = ? ORDER BY installmentNumber ASC').all(p.id)
      })),
      officialReceipts
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao carregar detalhes do evento: ' + err.message });
  }
});

// ==========================================================
// 6. FLUXO DE CAIXA (CASH FLOW - PREVISTO VS. REALIZADO)
// ==========================================================
router.get('/cash-flow', (req, res) => {
  try {
    const { viewType = 'previsto', period = 'month', startDate, endDate, eventName, categoryId, flowType } = req.query;

    const today = new Date().toISOString().split('T')[0];
    let dateFrom = startDate ? String(startDate) : '';
    let dateTo = endDate ? String(endDate) : '';

    if (!dateFrom || !dateTo) {
      const now = new Date();
      if (period === 'today') {
        dateFrom = today;
        dateTo = today;
      } else if (period === 'week') {
        const firstDay = new Date(now.setDate(now.getDate() - now.getDay()));
        const lastDay = new Date(now.setDate(now.getDate() - now.getDay() + 6));
        dateFrom = firstDay.toISOString().split('T')[0];
        dateTo = lastDay.toISOString().split('T')[0];
      } else if (period === 'month') {
        const y = now.getFullYear();
        const m = now.getMonth();
        dateFrom = new Date(y, m, 1).toISOString().split('T')[0];
        dateTo = new Date(y, m + 1, 0).toISOString().split('T')[0];
      } else if (period === 'previous_month') {
        const y = now.getFullYear();
        const m = now.getMonth() - 1;
        dateFrom = new Date(y, m, 1).toISOString().split('T')[0];
        dateTo = new Date(y, m + 1, 0).toISOString().split('T')[0];
      } else if (period === 'next_month') {
        const y = now.getFullYear();
        const m = now.getMonth() + 1;
        dateFrom = new Date(y, m, 1).toISOString().split('T')[0];
        dateTo = new Date(y, m + 1, 0).toISOString().split('T')[0];
      } else {
        // Default 90 days window
        dateFrom = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
        dateTo = new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0];
      }
    }

    interface FlowItem {
      id: string;
      date: string;
      type: 'entrada' | 'saida';
      partyName: string;
      eventName: string;
      description: string;
      categoryName: string;
      amountExpected: number;
      amountRealized: number;
      status: string;
      paymentMethod: string;
      referenceCode: string;
      isRealized: boolean;
      accumulatedBalance?: number;
    }

    const items: FlowItem[] = [];

    if (viewType === 'previsto') {
      // PREVISTO: Baseado nas parcelas a vencer/vencidas (sem misturar com valores já liquidados)
      if (flowType !== 'saida') {
        const recInst = db.prepare(`
          SELECT
            i.id,
            i.dueDate as date,
            'entrada' as type,
            r.eventName,
            r.clientSnapshot,
            r.code as referenceCode,
            'Receita Contratual: ' || COALESCE(r.eventName, 'Evento') as description,
            'Receitas de Eventos' as categoryName,
            i.originalAmount as amountExpected,
            i.receivedAmount as amountRealized,
            i.status,
            i.paymentMethod
          FROM financial_receivable_installments i
          JOIN financial_receivables r ON i.receivableId = r.id
          WHERE r.isDeleted = 0 AND i.status != 'cancelled'
            AND i.dueDate BETWEEN ? AND ?
            ${eventName ? 'AND r.eventName = ?' : ''}
        `).all(...[dateFrom, dateTo, ...(eventName ? [eventName] : [])]) as any[];

        recInst.forEach(ri => {
          let partyName = 'Cliente';
          try {
            const snap = JSON.parse(ri.clientSnapshot);
            partyName = snap.tradeName || snap.name || 'Cliente';
          } catch {}
          items.push({
            id: ri.id,
            date: ri.date,
            type: 'entrada',
            partyName,
            eventName: ri.eventName || '',
            description: ri.description,
            categoryName: ri.categoryName,
            amountExpected: ri.amountExpected,
            amountRealized: ri.amountRealized,
            status: ri.status,
            paymentMethod: ri.paymentMethod,
            referenceCode: ri.referenceCode,
            isRealized: false
          });
        });
      }

      if (flowType !== 'entrada') {
        const payInst = db.prepare(`
          SELECT
            i.id,
            i.dueDate as date,
            'saida' as type,
            p.eventName,
            p.supplierName as partyName,
            p.code as referenceCode,
            p.description,
            p.categoryName,
            i.originalAmount as amountExpected,
            i.paidAmount as amountRealized,
            i.status,
            p.paymentMethod
          FROM financial_payable_installments i
          JOIN financial_payables p ON i.payableId = p.id
          WHERE p.isDeleted = 0 AND i.status != 'cancelled'
            AND i.dueDate BETWEEN ? AND ?
            ${eventName ? 'AND p.eventName = ?' : ''}
            ${categoryId ? 'AND p.categoryId = ?' : ''}
        `).all(...[dateFrom, dateTo, ...(eventName ? [eventName] : []), ...(categoryId ? [categoryId] : [])]) as any[];

        payInst.forEach(pi => {
          items.push({
            id: pi.id,
            date: pi.date,
            type: 'saida',
            partyName: pi.partyName || 'Fornecedor',
            eventName: pi.eventName || '',
            description: pi.description,
            categoryName: pi.categoryName,
            amountExpected: pi.amountExpected,
            amountRealized: pi.amountRealized,
            status: pi.status,
            paymentMethod: pi.paymentMethod,
            referenceCode: pi.referenceCode,
            isRealized: false
          });
        });
      }
    } else {
      // REALIZADO: Baseado estritamente nas liquidações confirmadas (receipts e payments)
      if (flowType !== 'saida') {
        const recList = db.prepare(`
          SELECT
            rc.id,
            rc.receivedDate as date,
            'entrada' as type,
            r.eventName,
            r.clientSnapshot,
            rc.receiptNumber as referenceCode,
            'Recebimento ' || COALESCE(r.eventName, '') as description,
            'Receitas de Eventos' as categoryName,
            rc.amount as amountRealized,
            rc.amount as amountExpected,
            'Recebido' as status,
            rc.paymentMethod
          FROM financial_receipts rc
          JOIN financial_receivables r ON rc.receivableId = r.id
          WHERE rc.isReversed = 0
            AND rc.receivedDate BETWEEN ? AND ?
            ${eventName ? 'AND r.eventName = ?' : ''}
        `).all(...[dateFrom, dateTo, ...(eventName ? [eventName] : [])]) as any[];

        recList.forEach(rl => {
          let partyName = 'Cliente';
          try {
            const snap = JSON.parse(rl.clientSnapshot);
            partyName = snap.tradeName || snap.name || 'Cliente';
          } catch {}
          items.push({
            id: rl.id,
            date: rl.date,
            type: 'entrada',
            partyName,
            eventName: rl.eventName || '',
            description: rl.description,
            categoryName: rl.categoryName,
            amountExpected: rl.amountExpected,
            amountRealized: rl.amountRealized,
            status: 'Recebido',
            paymentMethod: rl.paymentMethod,
            referenceCode: rl.referenceCode,
            isRealized: true
          });
        });
      }

      if (flowType !== 'entrada') {
        const payList = db.prepare(`
          SELECT
            py.id,
            py.paymentDate as date,
            'saida' as type,
            p.eventName,
            p.supplierName as partyName,
            p.code as referenceCode,
            p.description,
            p.categoryName,
            py.amount as amountRealized,
            py.amount as amountExpected,
            'Pago' as status,
            py.paymentMethod
          FROM financial_payments py
          JOIN financial_payables p ON py.payableId = p.id
          WHERE py.isReversed = 0
            AND py.paymentDate BETWEEN ? AND ?
            ${eventName ? 'AND p.eventName = ?' : ''}
            ${categoryId ? 'AND p.categoryId = ?' : ''}
        `).all(...[dateFrom, dateTo, ...(eventName ? [eventName] : []), ...(categoryId ? [categoryId] : [])]) as any[];

        payList.forEach(pl => {
          items.push({
            id: pl.id,
            date: pl.date,
            type: 'saida',
            partyName: pl.partyName || 'Fornecedor',
            eventName: pl.eventName || '',
            description: pl.description,
            categoryName: pl.categoryName,
            amountExpected: pl.amountExpected,
            amountRealized: pl.amountRealized,
            status: 'Pago',
            paymentMethod: pl.paymentMethod,
            referenceCode: pl.referenceCode,
            isRealized: true
          });
        });
      }
    }

    // Sort chronologically
    items.sort((a, b) => a.date.localeCompare(b.date));

    // Calculate running accumulated balance
    let currentBalance = 0;
    const itemsWithBalance = items.map(item => {
      const effect = item.type === 'entrada'
        ? (viewType === 'realizado' ? item.amountRealized : item.amountExpected)
        : -(viewType === 'realizado' ? item.amountRealized : item.amountExpected);
      currentBalance = roundMoney(currentBalance + effect);
      return {
        ...item,
        accumulatedBalance: currentBalance
      };
    });

    const totalEntradas = roundMoney(items.filter(i => i.type === 'entrada').reduce((s, i) => s + (viewType === 'realizado' ? i.amountRealized : i.amountExpected), 0));
    const totalSaidas = roundMoney(items.filter(i => i.type === 'saida').reduce((s, i) => s + (viewType === 'realizado' ? i.amountRealized : i.amountExpected), 0));
    const saldoLiquido = roundMoney(totalEntradas - totalSaidas);

    res.json({
      viewType,
      dateFrom,
      dateTo,
      totalEntradas,
      totalSaidas,
      saldoLiquido,
      items: itemsWithBalance
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao gerar fluxo de caixa: ' + err.message });
  }
});

// ==========================================================
// 7. RECIBO OFICIAL SIMPLES (REC-AAAA-XXXX)
// ==========================================================
router.post('/receipts/:receiptId/issue', (req, res) => {
  try {
    const receipt: any = db.prepare('SELECT * FROM financial_receipts WHERE id = ?').get(req.params.receiptId);
    if (!receipt) return res.status(404).json({ error: 'Liquidação não encontrada.' });

    const receivable: any = db.prepare('SELECT * FROM financial_receivables WHERE id = ?').get(receipt.receivableId);
    if (!receivable) return res.status(404).json({ error: 'Título financeiro não encontrado.' });

    const installment: any = db.prepare('SELECT * FROM financial_receivable_installments WHERE id = ?').get(receipt.installmentId);

    // Check if an official document already exists for this receipt
    const existingDoc: any = db.prepare('SELECT * FROM financial_receipt_documents WHERE receiptId = ?').get(receipt.id);
    if (existingDoc) {
      return res.json({ success: true, document: existingDoc, message: 'Recibo oficial recuperado.' });
    }

    const { number, sequence, year } = generateNextReceiptDocNumber();
    const docId = randomUUID();
    const now = new Date().toISOString();

    const client = typeof receivable.clientSnapshot === 'string' ? JSON.parse(receivable.clientSnapshot) : (receivable.clientSnapshot || {});
    const settings: any = db.prepare("SELECT * FROM system_settings WHERE id = 'default'").get() || {};

    const clientName = client.name || client.tradeName || 'Cliente';
    const clientDoc = client.document || '';
    const amountInWords = valorPorExtenso(receipt.amount);

    const issuerName = settings.legalRepresentative || 'Diretoria Financeira';
    const issuerDoc = settings.cnpj || '38.921.450/0001-22';

    const referenceDescription = `Prestação de serviços para o evento ${receivable.eventName}`;
    const installmentDescription = installment?.identifier || `Parcela`;

    db.prepare(`
      INSERT INTO financial_receipt_documents (
        id, receiptNumber, sequenceNumber, year, receivableId, receiptId,
        clientName, clientDocument, amount, amountInWords, receiptDate,
        paymentMethod, referenceDescription, installmentDescription, eventName,
        contractNumber, proposalNumber, issuerName, issuerDocument, notes, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      docId, number, sequence, year, receivable.id, receipt.id,
      clientName, clientDoc, receipt.amount, amountInWords, receipt.receivedDate,
      receipt.paymentMethod, referenceDescription, installmentDescription, receivable.eventName,
      receivable.contractNumber, receivable.proposalNumber, issuerName, issuerDoc, receipt.notes || '', now
    );

    const doc = db.prepare('SELECT * FROM financial_receipt_documents WHERE id = ?').get(docId);

    res.json({ success: true, document: doc, message: 'Recibo oficial emitido com sucesso.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao emitir recibo oficial: ' + err.message });
  }
});

// GET Official Receipt Document
router.get('/receipts/document/:docId', (req, res) => {
  try {
    const doc = db.prepare('SELECT * FROM financial_receipt_documents WHERE id = ?').get(req.params.docId);
    if (!doc) return res.status(404).json({ error: 'Documento de recibo não encontrado.' });
    res.json(doc);
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao carregar recibo: ' + err.message });
  }
});

// GET PDF stream of Official Receipt
router.get('/receipts/document/:docId/pdf', (req, res) => {
  try {
    const doc: any = db.prepare('SELECT * FROM financial_receipt_documents WHERE id = ?').get(req.params.docId);
    if (!doc) return res.status(404).json({ error: 'Recibo não encontrado.' });

    const settings = db.prepare("SELECT * FROM system_settings WHERE id = 'default'").get()
      || db.prepare('SELECT * FROM system_settings LIMIT 1').get();

    const { buffer, fileName } = generateFinancialReceiptPDF({ receiptDoc: doc, settings });

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
    res.status(500).json({ error: 'Erro ao gerar PDF do recibo: ' + err.message });
  }
});

// ==========================================================
// 8. RELATÓRIOS E EXPORTAÇÃO (REPORTS)
// ==========================================================
router.get('/reports/export', (req, res) => {
  try {
    const { reportType, format = 'json', startDate, endDate } = req.query;

    let data: any[] = [];

    if (reportType === 'receivables') {
      data = db.prepare(`
        SELECT
          r.code as Codigo,
          i.identifier as Parcela,
          r.contractNumber as Contrato,
          r.proposalNumber as Proposta,
          json_extract(r.clientSnapshot, '$.name') as Cliente,
          r.eventName as Evento,
          i.dueDate as Vencimento,
          i.originalAmount as ValorOriginal,
          i.receivedAmount as ValorRecebido,
          i.balance as Saldo,
          i.status as Status,
          i.paymentMethod as FormaPagamento
        FROM financial_receivable_installments i
        JOIN financial_receivables r ON i.receivableId = r.id
        WHERE r.isDeleted = 0
        ORDER BY i.dueDate ASC
      `).all();
    } else if (reportType === 'payables') {
      data = db.prepare(`
        SELECT
          p.code as Codigo,
          i.identifier as Parcela,
          p.supplierName as Fornecedor,
          p.categoryName as Categoria,
          p.eventName as Evento,
          i.dueDate as Vencimento,
          i.originalAmount as ValorOriginal,
          i.paidAmount as ValorPago,
          i.balance as Saldo,
          i.status as Status
        FROM financial_payable_installments i
        JOIN financial_payables p ON i.payableId = p.id
        WHERE p.isDeleted = 0
        ORDER BY i.dueDate ASC
      `).all();
    } else if (reportType === 'overdue') {
      const today = new Date().toISOString().split('T')[0];
      data = db.prepare(`
        SELECT
          'A Receber' as Tipo,
          r.code as Codigo,
          json_extract(r.clientSnapshot, '$.name') as ClienteFornecedor,
          r.eventName as Evento,
          i.dueDate as Vencimento,
          i.balance as SaldoDevedor,
          i.paymentMethod as Forma
        FROM financial_receivable_installments i
        JOIN financial_receivables r ON i.receivableId = r.id
        WHERE r.isDeleted = 0 AND i.status != 'cancelled' AND i.status != 'paid' AND i.dueDate < ?
        ORDER BY i.dueDate ASC
      `).all(today);
    } else {
      data = db.prepare('SELECT code, eventName, finalAmount, totalReceived, balance, status FROM financial_receivables WHERE isDeleted = 0').all();
    }

    if (format === 'csv') {
      if (data.length === 0) {
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        return res.send('Nenhum dado encontrado');
      }
      const headers = Object.keys(data[0]).join(';');
      const rows = data.map(d => Object.values(d).map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(';')).join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="Relatorio_${reportType || 'financeiro'}.csv"`);
      return res.send(`\uFEFF${headers}\n${rows}`);
    }

    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao gerar relatório: ' + err.message });
  }
});

// ==========================================================
// 9. CONFIGURAÇÕES FINANCEIRAS
// ==========================================================
router.get('/settings', (req, res) => {
  try {
    const row = db.prepare("SELECT * FROM financial_settings WHERE id = 'default'").get()
      || db.prepare('SELECT * FROM financial_settings LIMIT 1').get();
    res.json(row);
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao obter configurações financeiras: ' + err.message });
  }
});

router.put('/settings', (req, res) => {
  try {
    const {
      defaultReceivingAccountId,
      defaultPaymentAccountId,
      defaultPaymentMethod,
      defaultDueDays,
      allowFinancialWithoutContract,
      allowPaymentAboveValue,
      requireProofAttachment,
      requireReversalReason,
      receiptPrefix,
      receiptHeaderText,
      bankAccountDetails
    } = req.body;

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE financial_settings
      SET defaultReceivingAccountId = COALESCE(?, defaultReceivingAccountId),
          defaultPaymentAccountId = COALESCE(?, defaultPaymentAccountId),
          defaultPaymentMethod = COALESCE(?, defaultPaymentMethod),
          defaultDueDays = COALESCE(?, defaultDueDays),
          allowFinancialWithoutContract = COALESCE(?, allowFinancialWithoutContract),
          allowPaymentAboveValue = COALESCE(?, allowPaymentAboveValue),
          requireProofAttachment = COALESCE(?, requireProofAttachment),
          requireReversalReason = COALESCE(?, requireReversalReason),
          receiptPrefix = COALESCE(?, receiptPrefix),
          receiptHeaderText = COALESCE(?, receiptHeaderText),
          bankAccountDetails = COALESCE(?, bankAccountDetails),
          updatedAt = ?
      WHERE id = 'default'
    `).run(
      defaultReceivingAccountId || null,
      defaultPaymentAccountId || null,
      defaultPaymentMethod || null,
      defaultDueDays !== undefined ? defaultDueDays : null,
      allowFinancialWithoutContract !== undefined ? (allowFinancialWithoutContract ? 1 : 0) : null,
      allowPaymentAboveValue !== undefined ? (allowPaymentAboveValue ? 1 : 0) : null,
      requireProofAttachment !== undefined ? (requireProofAttachment ? 1 : 0) : null,
      requireReversalReason !== undefined ? (requireReversalReason ? 1 : 0) : null,
      receiptPrefix || null,
      receiptHeaderText || null,
      bankAccountDetails || null,
      now
    );

    res.json({ success: true, message: 'Configurações financeiras salvas com sucesso.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao atualizar configurações financeiras: ' + err.message });
  }
});

export default router;
