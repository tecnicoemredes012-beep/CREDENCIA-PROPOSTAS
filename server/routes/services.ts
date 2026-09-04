import { Router } from 'express';
import { db } from '../database';
import { randomUUID } from 'crypto';

const router = Router();

// GET all services
router.get('/', (req, res) => {
  try {
    const onlyActive = req.query.active === 'true';
    const category = req.query.category ? String(req.query.category) : null;
    const search = req.query.search ? `%${String(req.query.search).trim()}%` : null;

    let query = `SELECT * FROM services WHERE isDeleted = 0`;
    const params: any[] = [];

    if (onlyActive) {
      query += ` AND isActive = 1`;
    }
    if (category) {
      query += ` AND category = ?`;
      params.push(category);
    }
    if (search) {
      query += ` AND (name LIKE ? OR defaultDescription LIKE ? OR category LIKE ?)`;
      params.push(search, search, search);
    }

    query += ` ORDER BY category ASC, name ASC`;

    const services = db.prepare(query).all(...params);
    res.json(services.map((s: any) => ({ ...s, isActive: Boolean(s.isActive) })));
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao listar serviços: ' + err.message });
  }
});

// GET service by id
router.get('/:id', (req, res) => {
  try {
    const service: any = db.prepare('SELECT * FROM services WHERE id = ? AND isDeleted = 0').get(req.params.id);
    if (!service) {
      return res.status(404).json({ error: 'Serviço não encontrado' });
    }
    res.json({ ...service, isActive: Boolean(service.isActive) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST create service
router.post('/', (req, res) => {
  try {
    const {
      name,
      defaultDescription,
      category,
      unit,
      unitPrice,
      commercialNotes,
      isActive = true
    } = req.body;

    if (!name || !defaultDescription || !unit || unitPrice === undefined) {
      return res.status(400).json({ error: 'Preencha os campos obrigatórios: Nome, Descrição, Unidade e Valor Unitário.' });
    }

    const id = randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO services (
        id, name, defaultDescription, category, unit, unitPrice,
        commercialNotes, isActive, isDeleted, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `).run(
      id, name.trim(), defaultDescription.trim(), category?.trim() || 'Geral',
      unit.trim(), Number(unitPrice), commercialNotes?.trim() || null,
      isActive ? 1 : 0, now, now
    );

    const created: any = db.prepare('SELECT * FROM services WHERE id = ?').get(id);
    res.status(201).json({ ...created, isActive: Boolean(created.isActive) });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao cadastrar serviço: ' + err.message });
  }
});

// PUT update service
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      defaultDescription,
      category,
      unit,
      unitPrice,
      commercialNotes,
      isActive
    } = req.body;

    const existing = db.prepare('SELECT * FROM services WHERE id = ? AND isDeleted = 0').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Serviço não encontrado' });
    }

    const now = new Date().toISOString();

    db.prepare(`
      UPDATE services SET
        name = ?, defaultDescription = ?, category = ?, unit = ?,
        unitPrice = ?, commercialNotes = ?, isActive = ?, updatedAt = ?
      WHERE id = ?
    `).run(
      name.trim(), defaultDescription.trim(), category?.trim() || 'Geral',
      unit.trim(), Number(unitPrice), commercialNotes?.trim() || null,
      isActive ? 1 : 0, now, id
    );

    const updated: any = db.prepare('SELECT * FROM services WHERE id = ?').get(id);
    res.json({ ...updated, isActive: Boolean(updated.isActive) });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao atualizar serviço: ' + err.message });
  }
});

// DELETE soft delete service
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const now = new Date().toISOString();

    const result = db.prepare('UPDATE services SET isDeleted = 1, updatedAt = ? WHERE id = ?').run(now, id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Serviço não encontrado' });
    }

    res.json({ message: 'Serviço removido com sucesso' });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao excluir serviço: ' + err.message });
  }
});

export default router;
