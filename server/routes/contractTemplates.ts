import { Router } from 'express';
import { db } from '../database';
import { randomUUID } from 'crypto';

const router = Router();

// GET all contract templates
router.get('/', (req, res) => {
  try {
    const templates = db.prepare(`
      SELECT t.*,
        (SELECT COUNT(*) FROM template_clauses WHERE templateId = t.id AND isActive = 1) as clauseCount
      FROM contract_templates t
      ORDER BY t.isDefault DESC, t.name ASC
    `).all();

    res.json(templates);
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao listar modelos: ' + err.message });
  }
});

// GET template by ID with clauses
router.get('/:id', (req, res) => {
  try {
    const template: any = db.prepare('SELECT * FROM contract_templates WHERE id = ?').get(req.params.id);
    if (!template) return res.status(404).json({ error: 'Modelo não encontrado' });

    const clauses = db.prepare('SELECT * FROM template_clauses WHERE templateId = ? ORDER BY orderIndex ASC').all(template.id);

    res.json({
      ...template,
      clauses
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao carregar modelo: ' + err.message });
  }
});

// PUT update template metadata
router.put('/:id', (req, res) => {
  try {
    const { name, description, isDefault, isActive } = req.body;
    const now = new Date().toISOString();

    const tx = db.transaction(() => {
      if (isDefault) {
        db.prepare('UPDATE contract_templates SET isDefault = 0').run();
      }

      db.prepare(`
        UPDATE contract_templates
        SET name = COALESCE(?, name),
            description = COALESCE(?, description),
            isDefault = COALESCE(?, isDefault),
            isActive = COALESCE(?, isActive),
            updatedAt = ?
        WHERE id = ?
      `).run(name, description, isDefault !== undefined ? (isDefault ? 1 : 0) : null, isActive !== undefined ? (isActive ? 1 : 0) : null, now, req.params.id);
    });

    tx();

    res.json({ success: true, message: 'Modelo atualizado com sucesso.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao atualizar modelo: ' + err.message });
  }
});

// PUT update template clauses
router.put('/:id/clauses', (req, res) => {
  try {
    const { clauses } = req.body;
    if (!Array.isArray(clauses)) {
      return res.status(400).json({ error: 'Lista de cláusulas inválida.' });
    }

    const tx = db.transaction(() => {
      db.prepare('DELETE FROM template_clauses WHERE templateId = ?').run(req.params.id);

      const insert = db.prepare(`
        INSERT INTO template_clauses (id, templateId, clauseNumber, title, content, orderIndex, isActive, isMandatory)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      clauses.forEach((c: any, idx: number) => {
        insert.run(
          c.id || randomUUID(),
          req.params.id,
          c.clauseNumber || (idx + 1),
          c.title,
          c.content,
          idx + 1,
          c.isActive !== false ? 1 : 0,
          c.isMandatory ? 1 : 0
        );
      });
    });

    tx();

    res.json({ success: true, message: 'Cláusulas do modelo salvas com sucesso.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao salvar cláusulas do modelo: ' + err.message });
  }
});

export default router;
