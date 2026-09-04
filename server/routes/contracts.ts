import { Router } from 'express';
import { db } from '../database';
import { randomUUID } from 'crypto';
import { generateNextContractNumber } from '../services/contractNumberingService';
import { generateServerContractPDF } from '../services/contractPdfService';
import { validateContractReady, ContractInterpolationContext } from '../../src/utils/contractVariables';

const router = Router();

// Helper to resolve live client snapshot for contracts
function getContractClientSnapshot(c: any): any {
  let clientParsed: any = {};
  try {
    clientParsed = typeof c.clientSnapshot === 'string' ? JSON.parse(c.clientSnapshot) : (c.clientSnapshot || {});
  } catch {}

  const clientId = clientParsed?.id;
  if (clientId) {
    const live = db.prepare('SELECT * FROM clients WHERE id = ? AND isDeleted = 0').get(clientId);
    if (live) return live;
  }
  if (c.proposalId) {
    const prop: any = db.prepare('SELECT clientId, clientSnapshot FROM proposals WHERE id = ?').get(c.proposalId);
    if (prop?.clientId) {
      const live = db.prepare('SELECT * FROM clients WHERE id = ? AND isDeleted = 0').get(prop.clientId);
      if (live) return live;
    }
  }
  return clientParsed;
}

// GET all contracts with filters
router.get('/', (req, res) => {
  try {
    const { search, status, proposalNumber, responsible } = req.query;

    let query = `
      SELECT c.*
      FROM contracts c
      WHERE c.isDeleted = 0
    `;
    const params: any[] = [];

    if (status) {
      query += ` AND c.status = ?`;
      params.push(String(status));
    }

    if (proposalNumber) {
      query += ` AND c.proposalNumber LIKE ?`;
      params.push(`%${String(proposalNumber).trim()}%`);
    }

    if (responsible) {
      query += ` AND (c.sentBy LIKE ? OR c.finalizedBy LIKE ? OR c.signedBy LIKE ?)`;
      params.push(`%${String(responsible).trim()}%`, `%${String(responsible).trim()}%`, `%${String(responsible).trim()}%`);
    }

    if (search) {
      const term = `%${String(search).trim()}%`;
      query += ` AND (
        c.number LIKE ?
        OR c.proposalNumber LIKE ?
        OR c.title LIKE ?
        OR json_extract(c.clientSnapshot, '$.name') LIKE ?
        OR json_extract(c.clientSnapshot, '$.tradeName') LIKE ?
        OR json_extract(c.eventSnapshot, '$.name') LIKE ?
      )`;
      params.push(term, term, term, term, term, term);
    }

    query += ` ORDER BY c.year DESC, c.sequenceNumber DESC`;

    const rows = db.prepare(query).all(...params);

    const contracts = rows.map((c: any) => ({
      ...c,
      clientSnapshot: getContractClientSnapshot(c),
      contractorSnapshot: JSON.parse(c.contractorSnapshot),
      eventSnapshot: JSON.parse(c.eventSnapshot),
      proposalSnapshot: JSON.parse(c.proposalSnapshot),
      servicesSnapshot: JSON.parse(c.servicesSnapshot),
      signatoriesSnapshot: c.signatoriesSnapshot ? JSON.parse(c.signatoriesSnapshot) : null
    }));

    res.json(contracts);
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao listar contratos: ' + err.message });
  }
});

// GET contract by ID (with clauses, versions, attachments and audit history)
router.get('/:id', (req, res) => {
  try {
    const row: any = db.prepare('SELECT * FROM contracts WHERE id = ? AND isDeleted = 0').get(req.params.id);
    if (!row) {
      return res.status(404).json({ error: 'Contrato não encontrado' });
    }

    const clauses = db.prepare(`
      SELECT * FROM contract_clauses
      WHERE contractId = ? AND versionNumber = ?
      ORDER BY orderIndex ASC
    `).all(row.id, row.currentVersion);

    const versions = db.prepare(`
      SELECT * FROM contract_versions
      WHERE contractId = ?
      ORDER BY versionNumber DESC
    `).all(row.id);

    const attachments = db.prepare(`
      SELECT * FROM contract_attachments
      WHERE contractId = ?
      ORDER BY createdAt DESC
    `).all(row.id);

    const history = db.prepare(`
      SELECT * FROM contract_status_history
      WHERE contractId = ?
      ORDER BY createdAt DESC
    `).all(row.id);

    // Check if the original proposal was modified after contract creation
    const proposalRow: any = db.prepare('SELECT updatedAt FROM proposals WHERE id = ?').get(row.proposalId);
    const proposalWasModified = proposalRow && proposalRow.updatedAt > row.proposalUpdatedAtAtGeneration;

    res.json({
      ...row,
      clientSnapshot: getContractClientSnapshot(row),
      contractorSnapshot: JSON.parse(row.contractorSnapshot),
      eventSnapshot: JSON.parse(row.eventSnapshot),
      proposalSnapshot: JSON.parse(row.proposalSnapshot),
      servicesSnapshot: JSON.parse(row.servicesSnapshot),
      signatoriesSnapshot: row.signatoriesSnapshot ? JSON.parse(row.signatoriesSnapshot) : null,
      clauses,
      versions,
      attachments,
      history,
      proposalWasModified,
      proposalCurrentUpdatedAt: proposalRow?.updatedAt || null
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao carregar contrato: ' + err.message });
  }
});

// POST generate contract from approved proposal
router.post('/from-proposal/:proposalId', (req, res) => {
  try {
    const proposal: any = db.prepare('SELECT * FROM proposals WHERE id = ? AND isDeleted = 0').get(req.params.proposalId);
    if (!proposal) {
      return res.status(404).json({ error: 'Proposta não encontrada' });
    }

    if (proposal.status !== 'approved') {
      return res.status(400).json({ error: 'Somente propostas aprovadas podem gerar contratos.' });
    }

    const items = db.prepare('SELECT * FROM proposal_items WHERE proposalId = ? ORDER BY orderIndex ASC').all(proposal.id);
    const settings: any = db.prepare("SELECT * FROM system_settings WHERE id = 'default'").get()
      || db.prepare('SELECT * FROM system_settings LIMIT 1').get();

    // Pick active default template
    const template: any = db.prepare('SELECT * FROM contract_templates WHERE isDefault = 1 AND isActive = 1 LIMIT 1').get()
      || db.prepare('SELECT * FROM contract_templates LIMIT 1').get();

    if (!template) {
      return res.status(500).json({ error: 'Nenhum modelo de contrato ativo encontrado.' });
    }

    const templateClauses: any[] = db.prepare('SELECT * FROM template_clauses WHERE templateId = ? AND isActive = 1 ORDER BY orderIndex ASC').all(template.id);

    const now = new Date().toISOString();
    const contractId = randomUUID();
    const { number, sequenceNumber, year } = generateNextContractNumber();
    const clientParsed = getContractClientSnapshot({ clientSnapshot: proposal.clientSnapshot, proposalId: proposal.id });
    const contractorSnapshot = {
      companyName: settings?.companyName || 'Credencia Tecnologia e Eventos Ltda',
      tradeName: settings?.tradeName || 'Credencia',
      cnpj: settings?.cnpj || '38.921.450/0001-22',
      address: settings?.address || 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP',
      phone: settings?.phone || '(11) 98765-4321',
      email: settings?.email || 'comercial@credencia.com.br',
      legalRepresentative: settings?.legalRepresentative || 'Fernando Santos',
      legalRepresentativeCpf: settings?.legalRepresentativeCpf || '123.456.789-00',
      legalRepresentativeRole: settings?.legalRepresentativeRole || 'Diretor Comercial',
      defaultCourt: settings?.defaultCourt || 'Comarca de São Paulo / SP',
      defaultSignatureCity: settings?.defaultSignatureCity || 'São Paulo - SP'
    };

    const eventSnapshot = {
      name: proposal.eventName,
      startDate: proposal.eventStartDate,
      endDate: proposal.eventEndDate,
      location: proposal.eventLocation,
      city: proposal.eventCity,
      state: proposal.eventState,
      estimatedAttendees: proposal.estimatedAttendees
    };

    const proposalSnapshot = {
      proposalNumber: proposal.number,
      issueDate: proposal.issueDate,
      dueDate: proposal.dueDate,
      subtotal: proposal.subtotal,
      discountPercent: proposal.discountPercent,
      discountAmount: proposal.discountAmount,
      finalAmount: proposal.finalAmount,
      paymentMethod: proposal.paymentMethod,
      paymentTerms: proposal.paymentTerms,
      financialNotes: proposal.financialNotes,
      responsibleName: proposal.responsibleName
    };

    // Atomic transaction creating contract and copying clauses
    const createTx = db.transaction(() => {
      db.prepare(`
        INSERT INTO contracts (
          id, number, sequenceNumber, year, proposalId, proposalNumber, templateId, templateName,
          title, status, currentVersion, clientSnapshot, contractorSnapshot, eventSnapshot,
          proposalSnapshot, servicesSnapshot, proposalUpdatedAtAtGeneration, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        contractId,
        number,
        sequenceNumber,
        year,
        proposal.id,
        proposal.number,
        template.id,
        template.name,
        `Contrato de Prestação de Serviços - ${proposal.eventName}`,
        'draft',
        1,
        JSON.stringify(clientParsed),
        JSON.stringify(contractorSnapshot),
        JSON.stringify(eventSnapshot),
        JSON.stringify(proposalSnapshot),
        JSON.stringify(items),
        proposal.updatedAt,
        now,
        now
      );

      // Copy template clauses into contract_clauses for version 1
      const insertClause = db.prepare(`
        INSERT INTO contract_clauses (id, contractId, versionNumber, clauseNumber, title, content, orderIndex, isActive, isMandatory)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      templateClauses.forEach((tc, idx) => {
        insertClause.run(
          randomUUID(),
          contractId,
          1,
          tc.clauseNumber,
          tc.title,
          tc.content,
          idx + 1,
          tc.isActive,
          tc.isMandatory
        );
      });

      // Record audit history
      db.prepare(`
        INSERT INTO contract_status_history (id, contractId, previousStatus, newStatus, action, details, performedBy, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        randomUUID(),
        contractId,
        null,
        'draft',
        'Criação do contrato',
        `Contrato gerado a partir da Proposta aprovada ${proposal.number}`,
        req.body?.performedBy || 'Administrador',
        now
      );
    });

    createTx();

    res.status(201).json({
      id: contractId,
      number,
      proposalNumber: proposal.number,
      status: 'draft'
    });
  } catch (err: any) {
    console.error('Erro ao gerar contrato a partir da proposta:', err);
    res.status(500).json({ error: 'Erro ao gerar contrato: ' + err.message });
  }
});

// PUT update contract draft / clauses
router.put('/:id', (req, res) => {
  try {
    const contract: any = db.prepare('SELECT * FROM contracts WHERE id = ? AND isDeleted = 0').get(req.params.id);
    if (!contract) {
      return res.status(404).json({ error: 'Contrato não encontrado' });
    }

    if (contract.status === 'signed' || contract.status === 'active' || contract.status === 'closed') {
      return res.status(400).json({ error: 'Contratos assinados ou ativos não podem ser editados diretamente.' });
    }

    const { title, clauses, signatureCity, signatureDate, signatoriesSnapshot, performedBy } = req.body;
    const now = new Date().toISOString();

    const updateTx = db.transaction(() => {
      db.prepare(`
        UPDATE contracts
        SET title = COALESCE(?, title),
            signatureCity = COALESCE(?, signatureCity),
            signatureDate = COALESCE(?, signatureDate),
            signatoriesSnapshot = COALESCE(?, signatoriesSnapshot),
            updatedAt = ?
        WHERE id = ?
      `).run(
        title || contract.title,
        signatureCity || contract.signatureCity,
        signatureDate || contract.signatureDate,
        signatoriesSnapshot ? JSON.stringify(signatoriesSnapshot) : contract.signatoriesSnapshot,
        now,
        contract.id
      );

      // If clauses provided, replace active version clauses
      if (Array.isArray(clauses)) {
        db.prepare('DELETE FROM contract_clauses WHERE contractId = ? AND versionNumber = ?').run(contract.id, contract.currentVersion);

        const insertClause = db.prepare(`
          INSERT INTO contract_clauses (id, contractId, versionNumber, clauseNumber, title, content, orderIndex, isActive, isMandatory)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        clauses.forEach((c: any, idx: number) => {
          insertClause.run(
            c.id || randomUUID(),
            contract.id,
            contract.currentVersion,
            c.clauseNumber || (idx + 1),
            c.title,
            c.content,
            idx + 1,
            c.isActive !== false ? 1 : 0,
            c.isMandatory ? 1 : 0
          );
        });
      }

      // Record audit history
      db.prepare(`
        INSERT INTO contract_status_history (id, contractId, previousStatus, newStatus, action, details, performedBy, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        randomUUID(),
        contract.id,
        contract.status,
        contract.status,
        'Edição de cláusulas',
        'Cláusulas e parâmetros atualizados pelo usuário',
        performedBy || 'Administrador',
        now
      );
    });

    updateTx();

    res.json({ success: true, message: 'Contrato atualizado com sucesso.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao atualizar contrato: ' + err.message });
  }
});

// POST finalize contract
router.post('/:id/finalize', (req, res) => {
  try {
    const contract: any = db.prepare('SELECT * FROM contracts WHERE id = ? AND isDeleted = 0').get(req.params.id);
    if (!contract) {
      return res.status(404).json({ error: 'Contrato não encontrado' });
    }

    if (contract.status === 'signed' || contract.status === 'active') {
      return res.status(400).json({ error: 'Este contrato já foi finalizado e assinado.' });
    }

    const clauses: any[] = db.prepare('SELECT * FROM contract_clauses WHERE contractId = ? AND versionNumber = ? ORDER BY orderIndex ASC').all(contract.id, contract.currentVersion);

    // Validate variables
    const client = JSON.parse(contract.clientSnapshot);
    const contractor = JSON.parse(contract.contractorSnapshot);
    const event = JSON.parse(contract.eventSnapshot);
    const proposal = JSON.parse(contract.proposalSnapshot);
    const items = JSON.parse(contract.servicesSnapshot);

    const interpCtx: ContractInterpolationContext = {
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

    const missingFields = validateContractReady(interpCtx, clauses);
    if (missingFields.length > 0) {
      return res.status(422).json({
        error: 'Existem campos ou variáveis obrigatórias não preenchidas.',
        missingFields
      });
    }

    const now = new Date().toISOString();
    const performedBy = req.body?.performedBy || 'Administrador';

    db.prepare(`
      UPDATE contracts
      SET status = 'finalized', finalizedAt = ?, finalizedBy = ?, updatedAt = ?
      WHERE id = ?
    `).run(now, performedBy, now, contract.id);

    db.prepare(`
      INSERT INTO contract_status_history (id, contractId, previousStatus, newStatus, action, details, performedBy, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      randomUUID(),
      contract.id,
      contract.status,
      'finalized',
      'Finalização do contrato',
      'Contrato conferido e finalizado para envio às partes',
      performedBy,
      now
    );

    res.json({ success: true, message: 'Contrato finalizado com sucesso.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao finalizar contrato: ' + err.message });
  }
});

// POST record contract sent
router.post('/:id/send', (req, res) => {
  try {
    const contract: any = db.prepare('SELECT * FROM contracts WHERE id = ? AND isDeleted = 0').get(req.params.id);
    if (!contract) return res.status(404).json({ error: 'Contrato não encontrado' });

    const now = new Date().toISOString();
    const performedBy = req.body?.performedBy || 'Administrador';
    const notes = req.body?.notes || 'Contrato enviado para assinatura do cliente via e-mail';

    db.prepare(`
      UPDATE contracts
      SET status = 'sent', sentAt = ?, sentBy = ?, updatedAt = ?
      WHERE id = ?
    `).run(now, performedBy, now, contract.id);

    db.prepare(`
      INSERT INTO contract_status_history (id, contractId, previousStatus, newStatus, action, details, performedBy, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      randomUUID(),
      contract.id,
      contract.status,
      'sent',
      'Registro de Envio',
      notes,
      performedBy,
      now
    );

    res.json({ success: true, message: 'Envio registrado com sucesso.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao registrar envio: ' + err.message });
  }
});

// POST mark contract as signed (and prepare financial readiness)
router.post('/:id/sign', (req, res) => {
  try {
    const contract: any = db.prepare('SELECT * FROM contracts WHERE id = ? AND isDeleted = 0').get(req.params.id);
    if (!contract) return res.status(404).json({ error: 'Contrato não encontrado' });

    const now = new Date().toISOString();
    const { signatureDate, signatureType = 'physical', signatureNotes = '', performedBy = 'Administrador' } = req.body;

    db.prepare(`
      UPDATE contracts
      SET status = 'signed',
          signedAt = ?,
          signedBy = ?,
          signatureDate = COALESCE(?, signatureDate, date('now')),
          signatureType = ?,
          signatureNotes = ?,
          financialReleaseStatus = 'ready_for_release',
          updatedAt = ?
      WHERE id = ?
    `).run(
      now,
      performedBy,
      signatureDate || null,
      signatureType,
      signatureNotes,
      now,
      contract.id
    );

    db.prepare(`
      INSERT INTO contract_status_history (id, contractId, previousStatus, newStatus, action, details, performedBy, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      randomUUID(),
      contract.id,
      contract.status,
      'signed',
      'Contrato Assinado',
      `Assinatura registrada (${signatureType}). Processo pronto para liberação financeira. Nota: ${signatureNotes || 'Nenhuma'}`,
      performedBy,
      now
    );

    res.json({
      success: true,
      message: 'Contrato marcado como assinado. Pronto para liberação financeira.',
      financialReleaseStatus: 'ready_for_release'
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao assinar contrato: ' + err.message });
  }
});

// POST upload signed document attachment
router.post('/:id/upload-signed', (req, res) => {
  try {
    const contract: any = db.prepare('SELECT * FROM contracts WHERE id = ? AND isDeleted = 0').get(req.params.id);
    if (!contract) return res.status(404).json({ error: 'Contrato não encontrado' });

    const { fileName, fileType, fileSize, filePath, notes, performedBy = 'Administrador' } = req.body;
    if (!fileName) {
      return res.status(400).json({ error: 'Nome do arquivo obrigatório.' });
    }

    const now = new Date().toISOString();
    const attachmentId = randomUUID();

    const tx = db.transaction(() => {
      // Record attachment
      db.prepare(`
        INSERT INTO contract_attachments (id, contractId, fileName, fileType, fileSize, filePath, versionNumber, uploadedBy, notes, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        attachmentId,
        contract.id,
        fileName,
        fileType || 'application/pdf',
        fileSize || 0,
        filePath || fileName,
        contract.currentVersion,
        performedBy,
        notes || 'Documento assinado digitalizado',
        now
      );

      // Update contract signed document metadata and status
      db.prepare(`
        UPDATE contracts
        SET status = 'signed',
            signedDocumentName = ?,
            signedDocumentPath = ?,
            signedDocumentSize = ?,
            signedUploadedAt = ?,
            signedUploadedBy = ?,
            signedAt = COALESCE(signedAt, ?),
            signedBy = COALESCE(signedBy, ?),
            financialReleaseStatus = 'ready_for_release',
            updatedAt = ?
        WHERE id = ?
      `).run(
        fileName,
        filePath || fileName,
        fileSize || 0,
        now,
        performedBy,
        now,
        performedBy,
        now,
        contract.id
      );

      db.prepare(`
        INSERT INTO contract_status_history (id, contractId, previousStatus, newStatus, action, details, performedBy, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        randomUUID(),
        contract.id,
        contract.status,
        'signed',
        'Upload de Contrato Assinado',
        `Documento assinado anexado: ${fileName}. Liberação financeira autorizada.`,
        performedBy,
        now
      );
    });

    tx();

    res.json({ success: true, message: 'Documento assinado anexado com sucesso.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao anexar contrato assinado: ' + err.message });
  }
});

// POST create new version before signing
router.post('/:id/new-version', (req, res) => {
  try {
    const contract: any = db.prepare('SELECT * FROM contracts WHERE id = ? AND isDeleted = 0').get(req.params.id);
    if (!contract) return res.status(404).json({ error: 'Contrato não encontrado' });

    if (contract.status === 'signed' || contract.status === 'active') {
      return res.status(400).json({ error: 'Contratos já assinados não podem gerar nova versão simples. Devem gerar termo aditivo ou novo contrato.' });
    }

    const { reason = 'Revisão de cláusulas e ajustes comerciais', performedBy = 'Administrador' } = req.body;
    const now = new Date().toISOString();

    const oldVersion = contract.currentVersion;
    const newVersion = oldVersion + 1;

    const oldClauses = db.prepare('SELECT * FROM contract_clauses WHERE contractId = ? AND versionNumber = ?').all(contract.id, oldVersion);

    const versionTx = db.transaction(() => {
      // Archive current version snapshot
      db.prepare(`
        INSERT INTO contract_versions (id, contractId, versionNumber, title, reason, contentSnapshot, isCurrent, createdBy, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        randomUUID(),
        contract.id,
        oldVersion,
        `Versão ${oldVersion}`,
        reason,
        JSON.stringify(oldClauses),
        0,
        performedBy,
        now
      );

      // Increment contract version
      db.prepare(`
        UPDATE contracts
        SET currentVersion = ?, status = 'in_review', updatedAt = ?
        WHERE id = ?
      `).run(newVersion, now, contract.id);

      // Copy clauses to new version
      const insertClause = db.prepare(`
        INSERT INTO contract_clauses (id, contractId, versionNumber, clauseNumber, title, content, orderIndex, isActive, isMandatory)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      oldClauses.forEach((c: any) => {
        insertClause.run(
          randomUUID(),
          contract.id,
          newVersion,
          c.clauseNumber,
          c.title,
          c.content,
          c.orderIndex,
          c.isActive,
          c.isMandatory
        );
      });

      // Record audit
      db.prepare(`
        INSERT INTO contract_status_history (id, contractId, previousStatus, newStatus, action, details, performedBy, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        randomUUID(),
        contract.id,
        contract.status,
        'in_review',
        'Criação de Nova Versão',
        `Versão ${newVersion} criada a partir da Versão ${oldVersion}. Motivo: ${reason}`,
        performedBy,
        now
      );
    });

    versionTx();

    res.json({
      success: true,
      message: `Nova versão ${newVersion} criada com sucesso.`,
      newVersion
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao criar nova versão: ' + err.message });
  }
});

// GET official PDF stream / download
router.get('/:id/pdf', (req, res) => {
  try {
    const contract: any = db.prepare('SELECT * FROM contracts WHERE id = ? AND isDeleted = 0').get(req.params.id);
    if (!contract) return res.status(404).json({ error: 'Contrato não encontrado' });

    const clauses: any[] = db.prepare(`
      SELECT * FROM contract_clauses
      WHERE contractId = ? AND versionNumber = ?
      ORDER BY orderIndex ASC
    `).all(contract.id, contract.currentVersion);

    const settings: any = db.prepare("SELECT * FROM system_settings WHERE id = 'default'").get()
      || db.prepare('SELECT * FROM system_settings LIMIT 1').get();
    const resolvedContract = { ...contract, clientSnapshot: getContractClientSnapshot(contract) };
    const { buffer, fileName } = generateServerContractPDF({ contract: resolvedContract, clauses, settings });

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
    console.error('Erro ao gerar PDF do contrato:', err);
    res.status(500).json({ error: 'Erro ao gerar PDF do contrato: ' + err.message });
  }
});

export default router;
