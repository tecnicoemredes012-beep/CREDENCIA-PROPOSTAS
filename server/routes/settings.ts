import { Router } from 'express';
import { db } from '../database';

const router = Router();

// GET settings
router.get('/', (req, res) => {
  try {
    let settings = db.prepare('SELECT * FROM system_settings LIMIT 1').get();
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao buscar configurações: ' + err.message });
  }
});

// PUT update settings
router.put('/', (req, res) => {
  try {
    const {
      companyName,
      tradeName,
      cnpj,
      address,
      phone,
      email,
      website,
      logoUrl,
      proposalPrefix,
      defaultValidityDays,
      defaultDiscountPercent,
      defaultPaymentTerms,
      footerText,
      generalConditions
    } = req.body;

    const now = new Date().toISOString();

    db.prepare(`
      UPDATE system_settings SET
        companyName = ?, tradeName = ?, cnpj = ?, address = ?, phone = ?,
        email = ?, website = ?, logoUrl = ?, proposalPrefix = ?,
        defaultValidityDays = ?, defaultDiscountPercent = ?, defaultPaymentTerms = ?,
        footerText = ?, generalConditions = ?, updatedAt = ?
      WHERE id = 'default'
    `).run(
      companyName.trim(), tradeName?.trim() || '', cnpj.trim(), address.trim(),
      phone.trim(), email.trim(), website?.trim() || '', logoUrl || null,
      (proposalPrefix || 'PROP').trim().toUpperCase(),
      Number(defaultValidityDays) || 15,
      Number(defaultDiscountPercent) || 0,
      defaultPaymentTerms?.trim() || 'Faturamento em 30 dias',
      footerText?.trim() || '',
      generalConditions?.trim() || '',
      now
    );

    const updated = db.prepare('SELECT * FROM system_settings WHERE id = \'default\'').get();
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao atualizar configurações: ' + err.message });
  }
});

export default router;
