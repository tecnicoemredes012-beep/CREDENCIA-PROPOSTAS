import { Router } from 'express';
import { db } from '../database';
import { randomUUID } from 'crypto';

const router = Router();

// GET all clients
router.get('/', (req, res) => {
  try {
    const search = req.query.search ? `%${String(req.query.search).trim()}%` : null;

    let query = `
      SELECT * FROM clients
      WHERE isDeleted = 0
    `;
    const params: any[] = [];

    if (search) {
      query += ` AND (name LIKE ? OR tradeName LIKE ? OR document LIKE ? OR contactPerson LIKE ? OR email LIKE ?)`;
      params.push(search, search, search, search, search);
    }

    query += ` ORDER BY name ASC`;

    const clients = db.prepare(query).all(...params);
    res.json(clients);
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao listar clientes: ' + err.message });
  }
});

// GET client by id
router.get('/:id', (req, res) => {
  try {
    const client = db.prepare('SELECT * FROM clients WHERE id = ? AND isDeleted = 0').get(req.params.id);
    if (!client) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    res.json(client);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST create client
router.post('/', (req, res) => {
  try {
    const {
      name,
      tradeName,
      document,
      contactPerson,
      role,
      email,
      phone,
      address,
      city,
      state,
      zipCode,
      notes
    } = req.body;

    if (!name || !document || !email || !contactPerson) {
      return res.status(400).json({ error: 'Preencha os campos obrigatórios: Nome, Documento, Responsável e E-mail.' });
    }

    const id = randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO clients (
        id, name, tradeName, document, contactPerson, role, email, phone,
        address, city, state, zipCode, notes, isDeleted, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `).run(
      id, name.trim(), tradeName?.trim() || null, document.trim(), contactPerson.trim(),
      role?.trim() || null, email.trim(), phone?.trim() || '', address?.trim() || null,
      city?.trim() || null, state?.trim() || null, zipCode?.trim() || null,
      notes?.trim() || null, now, now
    );

    const created = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao criar cliente: ' + err.message });
  }
});

// PUT update client
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      tradeName,
      document,
      contactPerson,
      role,
      email,
      phone,
      address,
      city,
      state,
      zipCode,
      notes
    } = req.body;

    const existing = db.prepare('SELECT * FROM clients WHERE id = ? AND isDeleted = 0').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    const now = new Date().toISOString();

    db.prepare(`
      UPDATE clients SET
        name = ?, tradeName = ?, document = ?, contactPerson = ?, role = ?,
        email = ?, phone = ?, address = ?, city = ?, state = ?, zipCode = ?,
        notes = ?, updatedAt = ?
      WHERE id = ?
    `).run(
      name.trim(), tradeName?.trim() || null, document.trim(), contactPerson.trim(),
      role?.trim() || null, email.trim(), phone?.trim() || '', address?.trim() || null,
      city?.trim() || null, state?.trim() || null, zipCode?.trim() || null,
      notes?.trim() || null, now, id
    );

    const updated: any = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);

    // Synchronize updated client snapshot to all active/non-cancelled proposals and contracts
    if (updated) {
      const snapshotString = JSON.stringify(updated);
      try {
        db.prepare(`
          UPDATE proposals
          SET clientSnapshot = ?, updatedAt = ?
          WHERE clientId = ? AND status != 'cancelled'
        `).run(snapshotString, now, id);

        db.prepare(`
          UPDATE contracts
          SET clientSnapshot = ?, updatedAt = ?
          WHERE proposalId IN (SELECT id FROM proposals WHERE clientId = ?)
        `).run(snapshotString, now, id);
      } catch (syncErr) {
        console.error('Erro ao sincronizar snapshot do cliente em propostas:', syncErr);
      }
    }

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao atualizar cliente: ' + err.message });
  }
});

// DELETE soft delete client
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const now = new Date().toISOString();

    const result = db.prepare('UPDATE clients SET isDeleted = 1, updatedAt = ? WHERE id = ?').run(now, id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    res.json({ message: 'Cliente removido com sucesso' });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao excluir cliente: ' + err.message });
  }
});

export default router;
