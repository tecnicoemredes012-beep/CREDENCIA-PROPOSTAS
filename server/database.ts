import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(process.cwd(), 'propostas.db');
export const db = new Database(dbPath);

// Enable WAL mode and foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  // 1. Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      pin TEXT,
      passwordHash TEXT,
      role TEXT NOT NULL DEFAULT 'OPERATOR',
      createdAt TEXT NOT NULL
    );
  `);

  // 2. Clients table
  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      tradeName TEXT,
      document TEXT NOT NULL,
      contactPerson TEXT NOT NULL,
      role TEXT,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      address TEXT,
      city TEXT,
      state TEXT,
      zipCode TEXT,
      notes TEXT,
      isDeleted INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `);

  // 3. Services table
  db.exec(`
    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      defaultDescription TEXT NOT NULL,
      category TEXT NOT NULL,
      unit TEXT NOT NULL,
      unitPrice REAL NOT NULL,
      commercialNotes TEXT,
      isActive INTEGER NOT NULL DEFAULT 1,
      isDeleted INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `);

  // 4. Proposals table
  db.exec(`
    CREATE TABLE IF NOT EXISTS proposals (
      id TEXT PRIMARY KEY,
      number TEXT UNIQUE NOT NULL,
      sequenceNumber INTEGER NOT NULL,
      year INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      issueDate TEXT NOT NULL,
      validityDays INTEGER NOT NULL DEFAULT 15,
      dueDate TEXT NOT NULL,
      responsibleName TEXT NOT NULL,
      clientId TEXT NOT NULL,
      clientSnapshot TEXT NOT NULL,
      eventName TEXT NOT NULL,
      eventStartDate TEXT,
      eventEndDate TEXT,
      eventLocation TEXT,
      eventCity TEXT,
      eventState TEXT,
      estimatedAttendees INTEGER,
      eventNotes TEXT,
      subtotal REAL NOT NULL DEFAULT 0,
      discountPercent REAL NOT NULL DEFAULT 0,
      discountAmount REAL NOT NULL DEFAULT 0,
      additionalAmount REAL NOT NULL DEFAULT 0,
      finalAmount REAL NOT NULL DEFAULT 0,
      paymentMethod TEXT NOT NULL DEFAULT 'Boleto bancário',
      paymentTerms TEXT NOT NULL DEFAULT 'Faturamento em 30 dias',
      financialNotes TEXT,
      internalNotes TEXT,
      termsAndConditions TEXT,
      pdfGeneratedAt TEXT,
      approvedAt TEXT,
      cancelledAt TEXT,
      isDeleted INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (clientId) REFERENCES clients (id)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_proposals_year_seq ON proposals (year, sequenceNumber);
    CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals (status);
    CREATE INDEX IF NOT EXISTS idx_proposals_clientId ON proposals (clientId);
  `);

  // 5. Proposal Items table (with snapshots)
  db.exec(`
    CREATE TABLE IF NOT EXISTS proposal_items (
      id TEXT PRIMARY KEY,
      proposalId TEXT NOT NULL,
      serviceId TEXT,
      orderIndex INTEGER NOT NULL DEFAULT 0,
      serviceName TEXT NOT NULL,
      description TEXT NOT NULL,
      unit TEXT NOT NULL,
      unitPrice REAL NOT NULL,
      quantity REAL NOT NULL,
      discount REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL,
      FOREIGN KEY (proposalId) REFERENCES proposals (id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_proposal_items_proposalId ON proposal_items (proposalId);
  `);

  // 6. Proposal Status History
  db.exec(`
    CREATE TABLE IF NOT EXISTS proposal_status_history (
      id TEXT PRIMARY KEY,
      proposalId TEXT NOT NULL,
      previousStatus TEXT,
      newStatus TEXT NOT NULL,
      changedBy TEXT NOT NULL,
      reason TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (proposalId) REFERENCES proposals (id) ON DELETE CASCADE
    );
  `);

  // 7. System Settings
  db.exec(`
    CREATE TABLE IF NOT EXISTS system_settings (
      id TEXT PRIMARY KEY,
      companyName TEXT NOT NULL,
      tradeName TEXT NOT NULL,
      cnpj TEXT NOT NULL,
      address TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      website TEXT NOT NULL,
      logoUrl TEXT,
      proposalPrefix TEXT NOT NULL DEFAULT 'PROP',
      defaultValidityDays INTEGER NOT NULL DEFAULT 15,
      defaultDiscountPercent REAL NOT NULL DEFAULT 0,
      defaultPaymentTerms TEXT NOT NULL DEFAULT 'Faturamento em 30 dias',
      footerText TEXT NOT NULL,
      generalConditions TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `);

  // Migrate system_settings with new contractor and contract fields if not present
  try {
    const settingsCols = db.prepare('PRAGMA table_info(system_settings)').all() as { name: string }[];
    const colNames = new Set(settingsCols.map(c => c.name));

    const newCols: [string, string][] = [
      ['stateRegistration', "TEXT DEFAULT 'Isento'"],
      ['municipalRegistration', "TEXT DEFAULT '12.345.678-9'"],
      ['legalRepresentative', "TEXT DEFAULT 'Fernando Santos'"],
      ['legalRepresentativeCpf', "TEXT DEFAULT '123.456.789-00'"],
      ['legalRepresentativeRole', "TEXT DEFAULT 'Diretor Comercial'"],
      ['legalRepresentativeEmail', "TEXT DEFAULT 'comercial@credencia.com.br'"],
      ['legalRepresentativePhone', "TEXT DEFAULT '(11) 98765-4321'"],
      ['defaultCourt', "TEXT DEFAULT 'Comarca de São Paulo / SP'"],
      ['defaultSignatureCity', "TEXT DEFAULT 'São Paulo - SP'"],
      ['contractPrefix', "TEXT DEFAULT 'CTR'"],
      ['allowFinancialWithoutContract', 'INTEGER DEFAULT 0']
    ];

    for (const [col, def] of newCols) {
      if (!colNames.has(col)) {
        db.exec(`ALTER TABLE system_settings ADD COLUMN ${col} ${def};`);
      }
    }
  } catch (err) {
    console.warn('Migração de colunas system_settings:', err);
  }

  // 8. Contract Templates
  db.exec(`
    CREATE TABLE IF NOT EXISTS contract_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL DEFAULT 'accreditation_services',
      isDefault INTEGER NOT NULL DEFAULT 1,
      isActive INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `);

  // 9. Template Clauses
  db.exec(`
    CREATE TABLE IF NOT EXISTS template_clauses (
      id TEXT PRIMARY KEY,
      templateId TEXT NOT NULL,
      clauseNumber INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      orderIndex INTEGER NOT NULL,
      isActive INTEGER NOT NULL DEFAULT 1,
      isMandatory INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (templateId) REFERENCES contract_templates (id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_template_clauses_template ON template_clauses (templateId);
  `);

  // 10. Contracts Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS contracts (
      id TEXT PRIMARY KEY,
      number TEXT UNIQUE NOT NULL,
      sequenceNumber INTEGER NOT NULL,
      year INTEGER NOT NULL,
      proposalId TEXT NOT NULL,
      proposalNumber TEXT NOT NULL,
      templateId TEXT,
      templateName TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      currentVersion INTEGER NOT NULL DEFAULT 1,
      clientSnapshot TEXT NOT NULL,
      contractorSnapshot TEXT NOT NULL,
      eventSnapshot TEXT NOT NULL,
      proposalSnapshot TEXT NOT NULL,
      servicesSnapshot TEXT NOT NULL,
      signatoriesSnapshot TEXT,
      signatureDate TEXT,
      signatureCity TEXT,
      signatureType TEXT,
      signatureNotes TEXT,
      signedDocumentPath TEXT,
      signedDocumentName TEXT,
      signedDocumentSize INTEGER,
      signedUploadedAt TEXT,
      signedUploadedBy TEXT,
      sentAt TEXT,
      sentBy TEXT,
      finalizedAt TEXT,
      finalizedBy TEXT,
      signedAt TEXT,
      signedBy TEXT,
      financialReleaseStatus TEXT NOT NULL DEFAULT 'pending',
      financialReleasedAt TEXT,
      financialReleasedBy TEXT,
      proposalUpdatedAtAtGeneration TEXT NOT NULL,
      isDeleted INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (proposalId) REFERENCES proposals (id)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_contracts_year_seq ON contracts (year, sequenceNumber);
    CREATE INDEX IF NOT EXISTS idx_contracts_proposalId ON contracts (proposalId);
    CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts (status);
  `);

  // 11. Contract Clauses (specific to each contract)
  db.exec(`
    CREATE TABLE IF NOT EXISTS contract_clauses (
      id TEXT PRIMARY KEY,
      contractId TEXT NOT NULL,
      versionNumber INTEGER NOT NULL DEFAULT 1,
      clauseNumber INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      orderIndex INTEGER NOT NULL,
      isActive INTEGER NOT NULL DEFAULT 1,
      isMandatory INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (contractId) REFERENCES contracts (id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_contract_clauses_contract ON contract_clauses (contractId);
  `);

  // 12. Contract Versions History
  db.exec(`
    CREATE TABLE IF NOT EXISTS contract_versions (
      id TEXT PRIMARY KEY,
      contractId TEXT NOT NULL,
      versionNumber INTEGER NOT NULL,
      title TEXT NOT NULL,
      reason TEXT,
      contentSnapshot TEXT NOT NULL,
      isCurrent INTEGER NOT NULL DEFAULT 0,
      createdBy TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (contractId) REFERENCES contracts (id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_contract_versions_contract ON contract_versions (contractId);
  `);

  // 13. Contract Attachments
  db.exec(`
    CREATE TABLE IF NOT EXISTS contract_attachments (
      id TEXT PRIMARY KEY,
      contractId TEXT NOT NULL,
      fileName TEXT NOT NULL,
      fileType TEXT NOT NULL,
      fileSize INTEGER NOT NULL,
      filePath TEXT NOT NULL,
      versionNumber INTEGER NOT NULL DEFAULT 1,
      uploadedBy TEXT NOT NULL,
      notes TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (contractId) REFERENCES contracts (id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_contract_attachments_contract ON contract_attachments (contractId);
  `);

  // 14. Contract Status History
  db.exec(`
    CREATE TABLE IF NOT EXISTS contract_status_history (
      id TEXT PRIMARY KEY,
      contractId TEXT NOT NULL,
      previousStatus TEXT,
      newStatus TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT,
      performedBy TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (contractId) REFERENCES contracts (id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_contract_history_contract ON contract_status_history (contractId);
  `);

  // ==========================================
  // MÓDULO FINANCEIRO — TABELAS E ESTRUTURAS
  // ==========================================

  // 15. Financial Accounts (Contas Bancárias / Caixa)
  db.exec(`
    CREATE TABLE IF NOT EXISTS financial_accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'checking',
      bankName TEXT,
      agency TEXT,
      accountNumber TEXT,
      isDefault INTEGER NOT NULL DEFAULT 0,
      isActive INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `);

  // 16. Financial Categories (Categorias de Receitas e Despesas)
  db.exec(`
    CREATE TABLE IF NOT EXISTS financial_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'expense',
      color TEXT,
      isSystem INTEGER NOT NULL DEFAULT 0,
      isActive INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_fin_categories_type ON financial_categories (type);
    CREATE INDEX IF NOT EXISTS idx_fin_categories_active ON financial_categories (isActive);
  `);

  // 17. Financial Receivables (Contas a Receber / Faturamento)
  db.exec(`
    CREATE TABLE IF NOT EXISTS financial_receivables (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      sequenceNumber INTEGER NOT NULL,
      year INTEGER NOT NULL,
      contractId TEXT,
      proposalId TEXT,
      proposalNumber TEXT,
      contractNumber TEXT,
      clientId TEXT NOT NULL,
      clientSnapshot TEXT NOT NULL,
      eventName TEXT NOT NULL,
      eventStartDate TEXT,
      eventEndDate TEXT,
      proposalAmount REAL NOT NULL DEFAULT 0,
      contractAmount REAL NOT NULL DEFAULT 0,
      discountAmount REAL NOT NULL DEFAULT 0,
      finalAmount REAL NOT NULL,
      paymentMethod TEXT NOT NULL,
      paymentTerms TEXT,
      paymentConditionType TEXT NOT NULL DEFAULT 'a_vista',
      installmentsCount INTEGER NOT NULL DEFAULT 1,
      entryAmount REAL NOT NULL DEFAULT 0,
      entryDate TEXT,
      firstDueDate TEXT NOT NULL,
      intervalDays INTEGER NOT NULL DEFAULT 30,
      destinationAccountId TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      totalReceived REAL NOT NULL DEFAULT 0,
      balance REAL NOT NULL,
      notes TEXT,
      organizationId TEXT NOT NULL DEFAULT 'default',
      createdBy TEXT NOT NULL,
      isDeleted INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (clientId) REFERENCES clients (id)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_fin_receivables_year_seq ON financial_receivables (year, sequenceNumber);
    CREATE INDEX IF NOT EXISTS idx_fin_receivables_contractId ON financial_receivables (contractId);
    CREATE INDEX IF NOT EXISTS idx_fin_receivables_proposalId ON financial_receivables (proposalId);
    CREATE INDEX IF NOT EXISTS idx_fin_receivables_clientId ON financial_receivables (clientId);
    CREATE INDEX IF NOT EXISTS idx_fin_receivables_status ON financial_receivables (status);
    CREATE INDEX IF NOT EXISTS idx_fin_receivables_eventName ON financial_receivables (eventName);
  `);

  // 18. Financial Receivable Installments (Parcelas a Receber)
  db.exec(`
    CREATE TABLE IF NOT EXISTS financial_receivable_installments (
      id TEXT PRIMARY KEY,
      receivableId TEXT NOT NULL,
      installmentNumber INTEGER NOT NULL,
      totalInstallments INTEGER NOT NULL,
      identifier TEXT NOT NULL,
      isEntry INTEGER NOT NULL DEFAULT 0,
      dueDate TEXT NOT NULL,
      originalAmount REAL NOT NULL,
      receivedAmount REAL NOT NULL DEFAULT 0,
      balance REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      paymentMethod TEXT NOT NULL,
      destinationAccountId TEXT,
      notes TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (receivableId) REFERENCES financial_receivables (id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_fin_rec_inst_receivable ON financial_receivable_installments (receivableId);
    CREATE INDEX IF NOT EXISTS idx_fin_rec_inst_dueDate ON financial_receivable_installments (dueDate);
    CREATE INDEX IF NOT EXISTS idx_fin_rec_inst_status ON financial_receivable_installments (status);
  `);

  // 19. Financial Receipts (Recebimentos / Liquidações)
  db.exec(`
    CREATE TABLE IF NOT EXISTS financial_receipts (
      id TEXT PRIMARY KEY,
      receivableId TEXT NOT NULL,
      installmentId TEXT NOT NULL,
      receiptNumber TEXT UNIQUE NOT NULL,
      receivedDate TEXT NOT NULL,
      amount REAL NOT NULL,
      paymentMethod TEXT NOT NULL,
      destinationAccountId TEXT,
      transactionRef TEXT,
      proofDocumentPath TEXT,
      proofDocumentName TEXT,
      notes TEXT,
      isReversed INTEGER NOT NULL DEFAULT 0,
      reversedAt TEXT,
      reversedBy TEXT,
      reversalReason TEXT,
      receivedBy TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (receivableId) REFERENCES financial_receivables (id) ON DELETE CASCADE,
      FOREIGN KEY (installmentId) REFERENCES financial_receivable_installments (id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_fin_receipts_receivable ON financial_receipts (receivableId);
    CREATE INDEX IF NOT EXISTS idx_fin_receipts_installment ON financial_receipts (installmentId);
    CREATE INDEX IF NOT EXISTS idx_fin_receipts_date ON financial_receipts (receivedDate);
  `);

  // 20. Financial Payables (Contas a Pagar / Despesas)
  db.exec(`
    CREATE TABLE IF NOT EXISTS financial_payables (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      sequenceNumber INTEGER NOT NULL,
      year INTEGER NOT NULL,
      description TEXT NOT NULL,
      supplierName TEXT NOT NULL,
      supplierDocument TEXT,
      categoryId TEXT NOT NULL,
      categoryName TEXT NOT NULL,
      eventName TEXT,
      proposalId TEXT,
      contractId TEXT,
      expenseDate TEXT NOT NULL,
      dueDate TEXT NOT NULL,
      amount REAL NOT NULL,
      paidAmount REAL NOT NULL DEFAULT 0,
      balance REAL NOT NULL,
      paymentType TEXT NOT NULL DEFAULT 'a_vista',
      installmentsCount INTEGER NOT NULL DEFAULT 1,
      intervalDays INTEGER NOT NULL DEFAULT 30,
      paymentMethod TEXT NOT NULL,
      sourceAccountId TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      notes TEXT,
      attachmentPath TEXT,
      attachmentName TEXT,
      organizationId TEXT NOT NULL DEFAULT 'default',
      createdBy TEXT NOT NULL,
      isDeleted INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (categoryId) REFERENCES financial_categories (id)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_fin_payables_year_seq ON financial_payables (year, sequenceNumber);
    CREATE INDEX IF NOT EXISTS idx_fin_payables_categoryId ON financial_payables (categoryId);
    CREATE INDEX IF NOT EXISTS idx_fin_payables_eventName ON financial_payables (eventName);
    CREATE INDEX IF NOT EXISTS idx_fin_payables_status ON financial_payables (status);
    CREATE INDEX IF NOT EXISTS idx_fin_payables_dueDate ON financial_payables (dueDate);
  `);

  // 21. Financial Payable Installments (Parcelas de Despesas)
  db.exec(`
    CREATE TABLE IF NOT EXISTS financial_payable_installments (
      id TEXT PRIMARY KEY,
      payableId TEXT NOT NULL,
      installmentNumber INTEGER NOT NULL,
      totalInstallments INTEGER NOT NULL,
      identifier TEXT NOT NULL,
      dueDate TEXT NOT NULL,
      originalAmount REAL NOT NULL,
      paidAmount REAL NOT NULL DEFAULT 0,
      balance REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      notes TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (payableId) REFERENCES financial_payables (id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_fin_pay_inst_payable ON financial_payable_installments (payableId);
    CREATE INDEX IF NOT EXISTS idx_fin_pay_inst_dueDate ON financial_payable_installments (dueDate);
    CREATE INDEX IF NOT EXISTS idx_fin_pay_inst_status ON financial_payable_installments (status);
  `);

  // 22. Financial Payments (Pagamentos Realizados de Despesas)
  db.exec(`
    CREATE TABLE IF NOT EXISTS financial_payments (
      id TEXT PRIMARY KEY,
      payableId TEXT NOT NULL,
      installmentId TEXT NOT NULL,
      paymentDate TEXT NOT NULL,
      amount REAL NOT NULL,
      paymentMethod TEXT NOT NULL,
      sourceAccountId TEXT,
      transactionRef TEXT,
      proofDocumentPath TEXT,
      proofDocumentName TEXT,
      notes TEXT,
      isReversed INTEGER NOT NULL DEFAULT 0,
      reversedAt TEXT,
      reversedBy TEXT,
      reversalReason TEXT,
      paidBy TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (payableId) REFERENCES financial_payables (id) ON DELETE CASCADE,
      FOREIGN KEY (installmentId) REFERENCES financial_payable_installments (id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_fin_payments_payable ON financial_payments (payableId);
    CREATE INDEX IF NOT EXISTS idx_fin_payments_installment ON financial_payments (installmentId);
    CREATE INDEX IF NOT EXISTS idx_fin_payments_date ON financial_payments (paymentDate);
  `);

  // 23. Financial Official Receipt Documents (Recibos Oficiais REC-AAAA-XXXX)
  db.exec(`
    CREATE TABLE IF NOT EXISTS financial_receipt_documents (
      id TEXT PRIMARY KEY,
      receiptNumber TEXT UNIQUE NOT NULL,
      sequenceNumber INTEGER NOT NULL,
      year INTEGER NOT NULL,
      receivableId TEXT,
      receiptId TEXT,
      clientName TEXT NOT NULL,
      clientDocument TEXT NOT NULL,
      amount REAL NOT NULL,
      amountInWords TEXT NOT NULL,
      receiptDate TEXT NOT NULL,
      paymentMethod TEXT NOT NULL,
      referenceDescription TEXT NOT NULL,
      installmentDescription TEXT,
      eventName TEXT,
      contractNumber TEXT,
      proposalNumber TEXT,
      issuerName TEXT NOT NULL,
      issuerDocument TEXT NOT NULL,
      notes TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_fin_receipt_docs_year_seq ON financial_receipt_documents (year, sequenceNumber);
  `);

  // 24. Financial Audit History (Histórico Imutável)
  db.exec(`
    CREATE TABLE IF NOT EXISTS financial_history (
      id TEXT PRIMARY KEY,
      entityType TEXT NOT NULL,
      entityId TEXT NOT NULL,
      action TEXT NOT NULL,
      previousValue TEXT,
      newValue TEXT,
      reason TEXT,
      notes TEXT,
      performedBy TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_fin_history_entity ON financial_history (entityType, entityId);
    CREATE INDEX IF NOT EXISTS idx_fin_history_date ON financial_history (createdAt);
  `);

  // 25. Financial Settings (Configurações Financeiras Operacionais)
  db.exec(`
    CREATE TABLE IF NOT EXISTS financial_settings (
      id TEXT PRIMARY KEY,
      defaultReceivingAccountId TEXT,
      defaultPaymentAccountId TEXT,
      defaultPaymentMethod TEXT NOT NULL DEFAULT 'Boleto bancário',
      defaultDueDays INTEGER NOT NULL DEFAULT 30,
      allowFinancialWithoutContract INTEGER NOT NULL DEFAULT 0,
      allowPaymentAboveValue INTEGER NOT NULL DEFAULT 0,
      requireProofAttachment INTEGER NOT NULL DEFAULT 0,
      requireReversalReason INTEGER NOT NULL DEFAULT 1,
      receiptPrefix TEXT NOT NULL DEFAULT 'REC',
      receiptHeaderText TEXT,
      bankAccountDetails TEXT,
      updatedAt TEXT NOT NULL
    );
  `);

  // Run initial seeds
  seedInitialData();
}

function seedInitialData() {
  const now = new Date().toISOString();

  // 1. Admin user
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count === 0) {
    db.prepare(`
      INSERT INTO users (id, name, email, pin, passwordHash, role, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      randomUUID(),
      'Administrador Credencia',
      'admin@credencia.com.br',
      '1234',
      '1234', // In a production setup, bcrypt hash is used
      'ADMIN',
      now
    );
    console.log('✔ Usuário administrador criado: admin@credencia.com.br / PIN: 1234');
  }

  // 2. Initial Settings
  const settingsCount = db.prepare('SELECT COUNT(*) as count FROM system_settings').get() as { count: number };
  if (settingsCount.count === 0) {
    db.prepare(`
      INSERT INTO system_settings (
        id, companyName, tradeName, cnpj, address, phone, email, website, logoUrl,
        proposalPrefix, defaultValidityDays, defaultDiscountPercent, defaultPaymentTerms,
        footerText, generalConditions, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'default',
      'Credencia Tecnologia e Eventos Ltda',
      'Credencia Orçamentos',
      '38.921.450/0001-22',
      'Av. Paulista, 1000 - Bela Vista, São Paulo - SP, CEP 01310-100',
      '(11) 98765-4321',
      'comercial@credencia.com.br',
      'https://credencia.com.br',
      '/src/assets/credencia-logo.png',
      'PROP',
      15,
      0,
      'Faturamento em 30 dias',
      'Credencia Tecnologia em Eventos • CNPJ 38.921.450/0001-22 • comercial@credencia.com.br',
      `1. Esta proposta tem validade pelo prazo estipulado no cabeçalho.\n2. Os serviços serão prestados em conformidade com as especificações técnicas descritas.\n3. O faturamento será emitido com prazo de 30 dias corridos após a realização do evento.\n4. Cancelamentos solicitados com menos de 5 dias úteis de antecedência implicam retenção de 20% do valor contratado.\n5. Eventuais serviços extraordinários demandados durante o evento serão faturados à parte mediante autorização do contratante.`,
      now
    );
    console.log('✔ Configurações padrão do sistema cadastradas.');
  }

  // 3. Initial Services Catalog (the 4 required services)
  const serviceCount = db.prepare('SELECT COUNT(*) as count FROM services').get() as { count: number };
  if (serviceCount.count === 0) {
    const insertService = db.prepare(`
      INSERT INTO services (id, name, defaultDescription, category, unit, unitPrice, commercialNotes, isActive, isDeleted, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const services = [
      {
        id: 'serv-1',
        name: 'Credenciamento por participante',
        defaultDescription: 'Cobrança baseada no número de inscrições cadastradas, e não nos check-ins realizados.',
        category: 'Credenciamento',
        unit: 'participante',
        unitPrice: 2.00,
        commercialNotes: 'Ideal para congressos, conferências e eventos corporativos de todos os portes.'
      },
      {
        id: 'serv-2',
        name: 'Suporte remoto',
        defaultDescription: 'Atendimento por telefone ou WhatsApp durante os dias contratados, das 7h às 19h.',
        category: 'Suporte',
        unit: 'diária',
        unitPrice: 250.00,
        commercialNotes: 'Técnico sênior exclusivo para plantão de dúvidas e contingências.'
      },
      {
        id: 'serv-3',
        name: 'Importação de inscritos',
        defaultDescription: 'Importação de uma lista conforme o padrão fornecido, enviada com pelo menos um dia útil de antecedência.',
        category: 'Operacional',
        unit: 'importação',
        unitPrice: 800.00,
        commercialNotes: 'Inclui higienização de planilha, validação de duplicidades e formatação de crachás.'
      },
      {
        id: 'serv-4',
        name: 'Personalização do sistema',
        defaultDescription: 'Personalização visual e operacional do Credencia conforme as necessidades do evento.',
        category: 'Customização',
        unit: 'serviço',
        unitPrice: 2000.00,
        commercialNotes: 'Aplicação de identidade visual, logos, credenciais personalizadas e campos customizados.'
      }
    ];

    for (const s of services) {
      insertService.run(s.id, s.name, s.defaultDescription, s.category, s.unit, s.unitPrice, s.commercialNotes, 1, 0, now, now);
    }
    console.log('✔ Catálogo inicial dos 4 serviços oficiais cadastrado.');
  }

  // 4. Initial Example Client and Proposal
  const clientCount = db.prepare('SELECT COUNT(*) as count FROM clients').get() as { count: number };
  if (clientCount.count === 0) {
    const clientId = 'cli-1';
    const client = {
      id: clientId,
      name: 'Giga Produções e Eventos Corporativos Ltda',
      tradeName: 'Grupo Giga Eventos',
      document: '12.345.678/0001-90',
      contactPerson: 'Renato Albuquerque',
      role: 'Diretor de Operações',
      email: 'operacoes@giga.com.br',
      phone: '(11) 99887-1122',
      address: 'Rua Bela Cintra, 450 - Consolação',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01415-000',
      notes: 'Cliente preferencial com eventos semestrais.',
      isDeleted: 0,
      createdAt: now,
      updatedAt: now
    };

    db.prepare(`
      INSERT INTO clients (id, name, tradeName, document, contactPerson, role, email, phone, address, city, state, zipCode, notes, isDeleted, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      client.id, client.name, client.tradeName, client.document, client.contactPerson,
      client.role, client.email, client.phone, client.address, client.city,
      client.state, client.zipCode, client.notes, client.isDeleted, client.createdAt, client.updatedAt
    );

    // Initial example proposal matching the prompt:
    // 500 participantes x R$ 2,00 = R$ 1.000,00
    // 3 diárias de suporte x R$ 250,00 = R$ 750,00
    // 1 importação x R$ 800,00 = R$ 800,00
    // 1 personalização x R$ 2.000,00 = R$ 2.000,00
    // Subtotal: R$ 4.550,00
    // Desconto de 10%: R$ 455,00
    // Valor final: R$ 4.095,00
    // Pagamento: faturamento em 30 dias.
    const proposalId = 'prop-example-1';
    const currentYear = new Date().getFullYear();
    const proposalNumber = `PROP-${currentYear}-0001`;
    const issueDate = new Date().toISOString().split('T')[0];
    const dueDate = new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0];

    db.prepare(`
      INSERT INTO proposals (
        id, number, sequenceNumber, year, status, issueDate, validityDays, dueDate,
        responsibleName, clientId, clientSnapshot, eventName, eventStartDate, eventEndDate,
        eventLocation, eventCity, eventState, estimatedAttendees, eventNotes,
        subtotal, discountPercent, discountAmount, additionalAmount, finalAmount,
        paymentMethod, paymentTerms, financialNotes, internalNotes, termsAndConditions,
        isDeleted, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      proposalId,
      proposalNumber,
      1,
      currentYear,
      'approved',
      issueDate,
      15,
      dueDate,
      'Fernando Santos',
      clientId,
      JSON.stringify(client),
      'REGISTER GIGA 2026',
      `${currentYear}-05-23`,
      `${currentYear}-05-24`,
      'Centro de Convenções Pro Magno',
      'São Paulo',
      'SP',
      500,
      'Evento corporativo de dois dias com credenciamento presencial e suporte integral.',
      4550.00,
      10.0,
      455.00,
      0,
      4095.00,
      'Boleto bancário',
      'Faturamento em 30 dias',
      'Faturamento emitido após conclusão do evento com vencimento para 30 dias corridos.',
      'Proposta padrão negociada e pré-aprovada pelo cliente.',
      'Condições conforme contrato padrão Credencia.',
      0,
      now,
      now
    );

    // Insert the 4 proposal items
    const insertItem = db.prepare(`
      INSERT INTO proposal_items (id, proposalId, serviceId, orderIndex, serviceName, description, unit, unitPrice, quantity, discount, total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertItem.run(
      randomUUID(), proposalId, 'serv-1', 1,
      'Credenciamento por participante',
      'Cobrança baseada no número de inscrições cadastradas, e não nos check-ins realizados.',
      'participante', 2.00, 500, 0, 1000.00
    );

    insertItem.run(
      randomUUID(), proposalId, 'serv-2', 2,
      'Suporte remoto',
      'Atendimento por telefone ou WhatsApp durante os dias contratados, das 7h às 19h.',
      'diária', 250.00, 3, 0, 750.00
    );

    insertItem.run(
      randomUUID(), proposalId, 'serv-3', 3,
      'Importação de inscritos',
      'Importação de uma lista conforme o padrão fornecido, enviada com pelo menos um dia útil de antecedência.',
      'importação', 800.00, 1, 0, 800.00
    );

    insertItem.run(
      randomUUID(), proposalId, 'serv-4', 4,
      'Personalização do sistema',
      'Personalização visual e operacional do Credencia conforme as necessidades do evento.',
      'serviço', 2000.00, 1, 0, 2000.00
    );

    // Record initial status history
    db.prepare(`
      INSERT INTO proposal_status_history (id, proposalId, previousStatus, newStatus, changedBy, reason, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      randomUUID(), proposalId, null, 'approved', 'Fernando Santos', 'Proposta inicial aprovada pelo cliente', now
    );

    console.log(`✔ Proposta de exemplo criada com sucesso: ${proposalNumber} (R$ 4.095,00)`);
  }

  // 5. Default Contract Template Seed
  const templateCount = db.prepare('SELECT COUNT(*) as count FROM contract_templates').get() as { count: number };
  if (templateCount.count === 0) {
    const templateId = 'template-default-accreditation';
    db.prepare(`
      INSERT INTO contract_templates (id, name, description, type, isDefault, isActive, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      templateId,
      'Contrato de Prestação de Serviços de Credenciamento',
      'Modelo padrão operacional para prestação de serviços de credenciamento, controle de acesso e tecnologia em eventos.',
      'accreditation_services',
      1,
      1,
      now,
      now
    );

    const clauses: { num: number; title: string; content: string }[] = [
      {
        num: 1,
        title: 'Cláusula 1ª — Da Identificação das Partes',
        content: `CONTRATANTE: {{CONTRATANTE_RAZAO_SOCIAL}}, inscrita no CNPJ/CPF sob nº {{CONTRATANTE_CNPJ}}, com sede/endereço em {{CONTRATANTE_ENDERECO}}, neste ato representada por {{REPRESENTANTE_CONTRATANTE}}.\n\nCONTRATADA: {{CONTRATADA_RAZAO_SOCIAL}}, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº {{CONTRATADA_CNPJ}}, com sede em {{CONTRATADA_ENDERECO}}, doravante denominada simplesmente CREDENCIA, representada na forma de seu Contrato Social por {{REPRESENTANTE_CONTRATADA}}.\n\nAs partes têm entre si justo e avençado o presente Contrato de Prestação de Serviços de Credenciamento, que se regerá pelas cláusulas seguintes e pelas disposições legais aplicáveis.`
      },
      {
        num: 2,
        title: 'Cláusula 2ª — Do Objeto do Contrato',
        content: `O presente instrumento tem por objeto a prestação, pela CONTRATADA à CONTRATANTE, de serviços de credenciamento, controle de acesso e tecnologia para eventos, conforme especificações, prazos e quantitativos constantes na Proposta Comercial nº {{NUMERO_PROPOSTA}}, a qual passa a integrar este instrumento contratual para todos os fins de direito.`
      },
      {
        num: 3,
        title: 'Cláusula 3ª — Dos Serviços Contratados e Escopo',
        content: `A CONTRATADA executará especificamente os seguintes serviços acordados:\n{{SERVICOS_CONTRATADOS}}\n\nParágrafo Único: Quaisquer serviços, horas técnicas, licenças ou recursos adicionais não expressamente relacionados neste escopo serão objeto de aprovação prévia e orçamento complementar por meio de termo aditivo.`
      },
      {
        num: 4,
        title: 'Cláusula 4ª — Dos Dados do Evento e Operação',
        content: `Os serviços contratados destinam-se exclusivamente ao seguinte evento:\n- Evento: {{NOME_EVENTO}}\n- Período de Realização: {{DATA_EVENTO}}\n- Local do Evento: {{LOCAL_EVENTO}}\n\nParágrafo Único: A alteração de datas, local ou formato do evento dependerá de consulta formal prévia à CONTRATADA com antecedência mínima de 15 (quinze) dias, sujeita à disponibilidade técnica e operacional.`
      },
      {
        num: 5,
        title: 'Cláusula 5ª — Das Obrigações da CONTRATADA',
        content: `São obrigações da CONTRATADA:\na) Disponibilizar a plataforma e sistema Credencia configurado de acordo com as especificações contratadas;\nb) Prestar o suporte técnico durante o período acordado na proposta comercial;\nc) Garantir o processamento seguro das credenciais e dados dos participantes em conformidade com as boas práticas técnicas;\nd) Realizar a importação de inscritos quando contratada, desde que a lista seja enviada no formato padrão da Credencia até 1 (um) dia útil antes do evento;\ne) Guardar sigilo sobre dados, relatórios e informações a que tiver acesso em razão da execução deste contrato.`
      },
      {
        num: 6,
        title: 'Cláusula 6ª — Das Obrigações da CONTRATANTE',
        content: `São obrigações da CONTRATANTE:\na) Fornecer todas as informações, logotipos, artes e cadastros necessários com a antecedência estipulada no cronograma;\nb) Disponibilizar no local do evento a infraestrutura física adequada (mesas, cadeiras, energia elétrica estabilizada e aterrada, e iluminação);\nc) Fornecer acesso à internet dedicado e estável no local do evento, conforme especificações de conectividade recomendadas;\nd) Designar um responsável operacional com autonomia para aprovações e validações durante a montagem e execução do evento;\ne) Efetuar os pagamentos devidos nas datas e condições pactuadas neste instrumento.`
      },
      {
        num: 7,
        title: 'Cláusula 7ª — Do Valor, Condições e Forma de Pagamento',
        content: `Pela prestação dos serviços contratados, a CONTRATANTE pagará à CONTRATADA o valor total de {{VALOR_CONTRATO}}.\n\n§ 1º: O pagamento será realizado através de {{CONDICAO_PAGAMENTO}}.\n§ 2º: O atraso no pagamento sujeitará a CONTRATANTE à multa moratória de 2% (dois por cento) sobre o valor inadimplido, acrescido de juros de mora de 1% (um por cento) ao mês e correção monetária pelo IPCA/IBGE.\n§ 3º: A quitação deste contrato autoriza a liberação dos relatórios e consolidações financeiras definitivas do evento.`
      },
      {
        num: 8,
        title: 'Cláusula 8ª — Do Prazo de Vigência e Execução',
        content: `O presente contrato entra em vigor na data de sua assinatura por ambas as partes e vigorará até a conclusão de todas as obrigações contratuais decorrentes do evento mencionado na Cláusula 4ª, inclusive as relativas a faturamento e liquidação financeira.`
      },
      {
        num: 9,
        title: 'Cláusula 9ª — Das Alterações de Escopo e Serviços Adicionais',
        content: `Toda e qualquer alteração de escopo, acréscimo de participantes que excedam a faixa contratada, prorrogação de horários ou solicitação de novas funcionalidades deverá ser formalizada por e-mail ou termo aditivo, com discriminação prévia de custos e prazos de execução.`
      },
      {
        num: 10,
        title: 'Cláusula 10ª — Do Cancelamento e da Rescisão',
        content: `O presente contrato poderá ser rescindido por mútuo acordo ou unilateralmente nas seguintes condições:\na) Por iniciativa da CONTRATANTE com antecedência mínima de 10 (dez) dias úteis da data do evento, mediante pagamento de 20% (vinte por cento) do valor total a título de indenização por despesas de preparação e reserva técnica;\nb) Caso o cancelamento ocorra com prazo inferior a 5 (cinco) dias úteis da data do evento, a CONTRATANTE pagará 50% (cinquenta por cento) do valor total contratado;\nc) Por descumprimento comprovado de qualquer das cláusulas deste instrumento por qualquer das partes, sem prejuízo de perdas e danos apurados.`
      },
      {
        num: 11,
        title: 'Cláusula 11ª — Da Responsabilidade por Conteúdos e Listas',
        content: `A CONTRATANTE é a única e exclusiva responsável pela legitimidade, integridade e veracidade dos cadastros de participantes, textos, marcas, slogans e imagens fornecidas para configuração do sistema, isentando expressamente a CONTRATADA de quaisquer questionamentos ou litígios de terceiros.`
      },
      {
        num: 12,
        title: 'Cláusula 12ª — Da Conectividade, Internet e Infraestrutura Externa',
        content: `A CONTRATADA não se responsabiliza por falhas de conectividade, oscilações no fornecimento de energia elétrica, indisponibilidade de links providos por terceiros no local do evento ou impedimentos causados pelas instalações físicas do espaço contratado pela CONTRATANTE.`
      },
      {
        num: 13,
        title: 'Cláusula 13ª — Da Confidencialidade e Proteção de Dados (LGPD)',
        content: `As partes obrigam-se a cumprir rigorosamente as disposições da Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 - LGPD). A CONTRATADA atuará na condição de Operadora dos dados pessoais tratados na execução dos serviços, adotando medidas técnicas e administrativas aptas a proteger os dados pessoais contra acessos não autorizados e situações acidentais ou ilícitas.`
      },
      {
        num: 14,
        title: 'Cláusula 14ª — Do Caso Fortuito e Força Maior',
        content: `Nenhuma das partes será responsabilizada pelo descumprimento total ou parcial de suas obrigações decorrente de caso fortuito ou força maior, nos termos do artigo 393 do Código Civil Brasileiro, devendo a parte afetada comunicar imediatamente à outra a ocorrência do fato impeditivo.`
      },
      {
        num: 15,
        title: 'Cláusula 15ª — Das Disposições Gerais e Vinculação da Proposta',
        content: `A tolerância de qualquer das partes quanto ao descumprimento de obrigações contratuais não constituirá novação nem renúncia a direitos. A Proposta Comercial nº {{NUMERO_PROPOSTA}} constitui anexo inseparável deste contrato para fins de interpretação técnica.`
      },
      {
        num: 16,
        title: 'Cláusula 16ª — Do Foro de Eleição',
        content: `Para dirimir quaisquer controvérsias oriundas da execução deste contrato, as partes elegem expressamente o Foro da {{FORO}}, com renúncia irretratável a qualquer outro, por mais privilegiado que seja.`
      },
      {
        num: 17,
        title: 'Cláusula 17ª — Do Fecho e Assinaturas',
        content: `E, por estarem justas e contratadas, as partes firmam o presente instrumento na presença de 2 (duas) testemunhas instrumentárias.\n\n{{CIDADE_ASSINATURA}}, {{DATA_ASSINATURA}}.\n\n______________________________________\nCONTRATANTE: {{CONTRATANTE_RAZAO_SOCIAL}}\nRepresentante: {{REPRESENTANTE_CONTRATANTE}}\n\n______________________________________\nCONTRATADA: {{CONTRATADA_RAZAO_SOCIAL}}\nRepresentante: {{REPRESENTANTE_CONTRATADA}}\n\nTestemunha 1: _________________________ CPF: _______________\n\nTestemunha 2: _________________________ CPF: _______________`
      }
    ];

    const insertClause = db.prepare(`
      INSERT INTO template_clauses (id, templateId, clauseNumber, title, content, orderIndex, isActive, isMandatory)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    clauses.forEach((c, idx) => {
      insertClause.run(randomUUID(), templateId, c.num, c.title, c.content, idx + 1, 1, 1);
    });

    console.log('✔ Modelo padrão de contrato de credenciamento cadastrado com 17 cláusulas.');
  }

  // 6. Seed Financial Categories (18 official categories)
  const catCount = db.prepare('SELECT COUNT(*) as count FROM financial_categories').get() as { count: number };
  if (catCount.count === 0) {
    const defaultExpenseCats = [
      { name: 'Técnicos', color: '#0284c7' },
      { name: 'Equipe de credenciamento', color: '#0ea5e9' },
      { name: 'Transporte', color: '#f59e0b' },
      { name: 'Combustível', color: '#d97706' },
      { name: 'Alimentação', color: '#10b981' },
      { name: 'Hospedagem', color: '#6366f1' },
      { name: 'Passagens', color: '#8b5cf6' },
      { name: 'Equipamentos', color: '#ec4899' },
      { name: 'Locação', color: '#f43f5e' },
      { name: 'Material de impressão', color: '#14b8a6' },
      { name: 'Etiquetas e suprimentos', color: '#06b6d4' },
      { name: 'Internet', color: '#3b82f6' },
      { name: 'Frete', color: '#eab308' },
      { name: 'Fornecedores', color: '#84cc16' },
      { name: 'Comissão', color: '#a855f7' },
      { name: 'Taxas', color: '#ef4444' },
      { name: 'Impostos', color: '#dc2626' },
      { name: 'Softwares', color: '#64748b' },
      { name: 'Outros', color: '#94a3b8' }
    ];

    const defaultRevenueCats = [
      { name: 'Prestação de Serviços de Credenciamento', color: '#12e000' },
      { name: 'Locação de Equipamentos', color: '#0eb800' },
      { name: 'Serviços Extras / Horas Adicionais', color: '#0a8900' },
      { name: 'Outras Receitas', color: '#7cff6f' }
    ];

    const insertCat = db.prepare(`
      INSERT INTO financial_categories (id, name, type, color, isSystem, isActive, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const cat of defaultExpenseCats) {
      insertCat.run(randomUUID(), cat.name, 'expense', cat.color, 1, 1, now, now);
    }
    for (const cat of defaultRevenueCats) {
      insertCat.run(randomUUID(), cat.name, 'revenue', cat.color, 1, 1, now, now);
    }
    console.log(`✔ Categorias financeiras cadastradas (${defaultExpenseCats.length} despesas + ${defaultRevenueCats.length} receitas).`);
  }

  // 7. Seed Financial Accounts
  const accountCount = db.prepare('SELECT COUNT(*) as count FROM financial_accounts').get() as { count: number };
  if (accountCount.count === 0) {
    const insertAcc = db.prepare(`
      INSERT INTO financial_accounts (id, name, type, bankName, agency, accountNumber, isDefault, isActive, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertAcc.run(
      'acc-default-itau',
      'Conta Corrente Principal (Banco Itaú)',
      'checking',
      'Banco Itaú Unibanco S.A.',
      '0452',
      '12345-6',
      1,
      1,
      now,
      now
    );

    insertAcc.run(
      'acc-default-pix',
      'Conta Pix Operacional',
      'pix',
      'Banco Itaú Unibanco S.A.',
      '0452',
      'pix@credencia.com.br',
      0,
      1,
      now,
      now
    );

    insertAcc.run(
      'acc-default-caixa',
      'Caixa Operacional Eventos',
      'cash',
      'Caixa Físico',
      '-',
      '-',
      0,
      1,
      now,
      now
    );

    console.log('✔ Contas financeiras iniciais cadastradas com sucesso.');
  }

  // 8. Seed Financial Settings
  const finSettingsCount = db.prepare('SELECT COUNT(*) as count FROM financial_settings').get() as { count: number };
  if (finSettingsCount.count === 0) {
    db.prepare(`
      INSERT INTO financial_settings (
        id, defaultReceivingAccountId, defaultPaymentAccountId, defaultPaymentMethod,
        defaultDueDays, allowFinancialWithoutContract, allowPaymentAboveValue,
        requireProofAttachment, requireReversalReason, receiptPrefix, receiptHeaderText,
        bankAccountDetails, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'default',
      'acc-default-itau',
      'acc-default-itau',
      'Boleto bancário',
      30,
      0,
      0,
      0,
      1,
      'REC',
      'Credencia Tecnologia e Eventos Ltda • CNPJ 38.921.450/0001-22',
      'Banco Itaú (341) • Agência: 0452 • Conta Corrente: 12345-6 • Chave Pix: financeiro@credencia.com.br',
      now
    );
    console.log('✔ Configurações financeiras operacionais inicializadas.');
  }
}

// Monetary Precision Utilities (Safe 2-decimal money without floating point drift)
export function roundMoney(val: number | string | null | undefined): number {
  const num = typeof val === 'string' ? parseFloat(val) : Number(val);
  if (isNaN(num) || !isFinite(num)) return 0;
  return Math.round(num * 100) / 100;
}

export function toCents(val: number | string | null | undefined): number {
  const num = typeof val === 'string' ? parseFloat(val) : Number(val);
  if (isNaN(num) || !isFinite(num)) return 0;
  return Math.round(num * 100);
}

export function fromCents(cents: number): number {
  return Number((cents / 100).toFixed(2));
}

// Ensure database schema and seeds are initialized on load
initDatabase();

