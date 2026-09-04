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
      stateRegistration,
      municipalRegistration,
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
      generalConditions,
      contractPrefix,
      legalRepresentative,
      legalRepresentativeCpf,
      legalRepresentativeRole,
      legalRepresentativeEmail,
      legalRepresentativePhone,
      defaultCourt,
      defaultSignatureCity,
      allowFinancialWithoutContract
    } = req.body;

    const now = new Date().toISOString();

    db.prepare(`
      UPDATE system_settings SET
        companyName = ?,
        tradeName = ?,
        cnpj = ?,
        stateRegistration = ?,
        municipalRegistration = ?,
        address = ?,
        phone = ?,
        email = ?,
        website = ?,
        logoUrl = ?,
        proposalPrefix = ?,
        defaultValidityDays = ?,
        defaultDiscountPercent = ?,
        defaultPaymentTerms = ?,
        footerText = ?,
        generalConditions = ?,
        contractPrefix = ?,
        legalRepresentative = ?,
        legalRepresentativeCpf = ?,
        legalRepresentativeRole = ?,
        legalRepresentativeEmail = ?,
        legalRepresentativePhone = ?,
        defaultCourt = ?,
        defaultSignatureCity = ?,
        allowFinancialWithoutContract = ?,
        updatedAt = ?
      WHERE id = 'default' OR id = (SELECT id FROM system_settings LIMIT 1)
    `).run(
      (companyName || '').trim(),
      (tradeName || '').trim(),
      (cnpj || '').trim(),
      (stateRegistration || '').trim(),
      (municipalRegistration || '').trim(),
      (address || '').trim(),
      (phone || '').trim(),
      (email || '').trim(),
      (website || '').trim(),
      logoUrl || null,
      (proposalPrefix || 'PROP').trim().toUpperCase(),
      Number(defaultValidityDays) || 15,
      Number(defaultDiscountPercent) || 0,
      (defaultPaymentTerms || 'Faturamento em 30 dias').trim(),
      (footerText || '').trim(),
      (generalConditions || '').trim(),
      (contractPrefix || 'CTR').trim().toUpperCase(),
      (legalRepresentative || '').trim(),
      (legalRepresentativeCpf || '').trim(),
      (legalRepresentativeRole || '').trim(),
      (legalRepresentativeEmail || '').trim(),
      (legalRepresentativePhone || '').trim(),
      (defaultCourt || '').trim(),
      (defaultSignatureCity || '').trim(),
      allowFinancialWithoutContract ? 1 : 0,
      now
    );

    const updated = db.prepare("SELECT * FROM system_settings WHERE id = 'default'").get()
      || db.prepare('SELECT * FROM system_settings LIMIT 1').get();
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao atualizar configurações: ' + err.message });
  }
});

export default router;
