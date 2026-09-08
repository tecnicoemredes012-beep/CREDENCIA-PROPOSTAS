# Credencia Orçamentos & Contratos

Sistema web responsivo para elaboração, gestão, impressão e emissão em PDF de propostas comerciais e contratos no padrão visual e de design oficial do ecossistema **Credencia**.

---

## 🚀 Principais Módulos e Funcionalidades

### 1. Painel de Controle (Dashboard)
- Indicadores em tempo real: Total de Propostas, Em Rascunho, Enviadas, Aprovadas, Vencidas e Faturamento Total Aprovado.
- Tabela de Propostas Recentes com ações diretas (Visualizar, Baixar PDF, Excluir).

### 2. Propostas Comerciais
- **Numeração Automática Sequencial Anual:** Padrão `PROP-AAAA-XXXX` gerado de forma atômica e sequencial via transações SQLite (`BEGIN IMMEDIATE`).
- **Editor Estruturado em 5 Etapas:**
  1. Identificação da Proposta e Vencimento.
  2. Seleção / Cadastro Rápido de Cliente com sincronização dinâmica.
  3. Dados do Evento (Nome, Local, Período, Público Estimado).
  4. Serviços e Escopo da Proposta (Catálogo oficial e itens personalizados).
  5. Resumo Financeiro com descontos, acréscimos e condições de pagamento.
- **Visualizador Formal A4:** Layout fiel de conferência e impressão sem elementos administrativos (`@media print`).
- **Geração e Download de PDF:** Emissão direta tanto no navegador quanto via servidor Node.js (`jsPDF` + `jspdf-autotable`).
- **Controle de Status e Auditoria:** Rascunho, Gerada, Enviada, Aprovada, Recusada e Cancelada.
- **Exclusão Segura:** Opção de exclusão em todas as telas com modal formal de confirmação.

### 3. Módulo de Contratos e Minutas
- Conversão instantânea de propostas aprovadas em instrumentos contratuais oficiais (`CTR-AAAA-XXXX`).
- Snapshots imutáveis dos dados no momento da contratação.
- Editor de cláusulas padrão e minutas personalizadas.
- Gestão de versões (`v1`, `v2`, etc.) e controle de liberação financeira.

### 4. Módulo Financeiro & Operações de Eventos
- **Integração Imediata Pós-Assinatura:** Prompt automático para geração do contas a receber a partir do contrato assinado.
- **Prevenção de Duplicidade:** Trava contra lançamentos repetidos com atalho "Ver financeiro".
- **Calculadora de Parcelas com Centavos Exatos:** À vista, parcelado e entrada + parcelas com arredondamento compensado na última parcela.
- **Contas a Receber e Recibos Oficiais:** Baixas parciais/totais, estornos com justificativa auditada e emissão de recibo timbrado oficial (`REC-AAAA-XXXX`) com valor por extenso em reais.
- **Contas a Pagar por Evento:** Controle de despesas operacionais com as 18 categorias oficiais do credenciamento.
- **DRE Operacional por Evento:** Resultado financeiro líquido (Receitas vs. Despesas) e Margem % com proteção contra divisão por zero.
- **Fluxo de Caixa Rigoroso:** Separação estrita entre Previsto (a vencer) e Realizado (liquidado).

### 5. Configurações Globais
- Dados da empresa (Razão Social, Nome Fantasia, CNPJ, Endereço, E-mail, Telefone).
- Representante legal para assinaturas e parâmetros jurídicos.
- Texto do rodapé oficial do PDF/Impressão.
- Termos e condições contratuais padrão.

---

## 📹 Demonstrações em Vídeo dos Fluxos

| Demonstração | Descrição | Arquivo |
| :--- | :--- | :--- |
| **Contrato & Contas a Receber** | Assinatura, geração de financeiro, cálculo de parcelas e liquidação completa. | [Ver Demonstração](docs/videos/fluxo_financeiro_contrato_recebiveis.webp) |
| **Despesas, DRE & Fluxo de Caixa** | Cadastro de despesas com categorias oficiais, DRE por evento e fluxo previsto vs. realizado. | [Ver Demonstração](docs/videos/fluxo_financeiro_despesas_dre_caixa.webp) |

---

## 🛠️ Tecnologias Utilizadas

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Lucide React
- **Backend:** Node.js, Express, TypeScript (`tsx`)
- **Banco de Dados:** SQLite 3 (`better-sqlite3`) com modo WAL e inicialização automática
- **PDF:** jsPDF, jspdf-autotable, html2canvas

---

## 💻 Como Executar o Projeto Localmente

1. **Instale as dependências:**
   ```bash
   npm install
   ```

2. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```
   O sistema estará disponível em [http://localhost:3005](http://localhost:3005).

3. **Para gerar a build de produção:**
   ```bash
   npm run build
   ```

---

## 🔒 Credenciais Padrão de Acesso

- **Acesso rápido por PIN:** `1234`
- **Acesso por E-mail:** `admin@credencia.com.br` / **Senha:** `1234`
