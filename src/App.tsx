import React, { useState, useEffect } from 'react';
import { AppShell } from './components/layout/AppShell';
import { NavItemKey } from './components/layout/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { ProposalsListPage } from './pages/ProposalsListPage';
import { ProposalFormPage } from './pages/ProposalFormPage';
import { ProposalViewPage } from './pages/ProposalViewPage';
import { ContractsListPage } from './pages/ContractsListPage';
import { ContractViewPage } from './pages/ContractViewPage';
import { ContractEditorPage } from './pages/ContractEditorPage';
import { ContractTemplatesPage } from './pages/ContractTemplatesPage';
import { ClientsPage } from './pages/ClientsPage';
import { ServicesPage } from './pages/ServicesPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { FinancialOverviewPage } from './pages/financial/FinancialOverviewPage';
import { ReceivablesListPage } from './pages/financial/ReceivablesListPage';
import { PayablesListPage } from './pages/financial/PayablesListPage';
import { CashFlowPage } from './pages/financial/CashFlowPage';
import { EventResultPage } from './pages/financial/EventResultPage';
import { CategoriesPage } from './pages/financial/CategoriesPage';
import { FinancialReportsPage } from './pages/financial/FinancialReportsPage';
import { api } from './services/api';
import { SystemSettings, Toast, User } from './types';

export function App() {
  // Authentication state
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('credencia_user');
    return saved ? JSON.parse(saved) : {
      id: 'admin-default',
      name: 'Administrador Credencia',
      email: 'admin@credencia.com.br',
      role: 'ADMIN'
    };
  });

  // Global settings
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<NavItemKey>('dashboard');
  const [viewingProposalId, setViewingProposalId] = useState<string | null>(null);
  const [editingProposalId, setEditingProposalId] = useState<string | null>(null);

  // Contracts module navigation state
  const [viewingContractId, setViewingContractId] = useState<string | null>(null);
  const [editingContractId, setEditingContractId] = useState<string | null>(null);
  const [managingTemplates, setManagingTemplates] = useState<boolean>(false);

  // Financial module navigation & filter state
  const [financialFilter, setFinancialFilter] = useState<{ eventName?: string; status?: string } | null>(null);

  // Theme state
  const [isDarkTheme, setIsDarkTheme] = useState(() => {
    return localStorage.getItem('credencia_theme') === 'dark';
  });

  // Toast notification state
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Sync theme with body class
  useEffect(() => {
    if (isDarkTheme) {
      document.documentElement.classList.add('theme-dark');
      localStorage.setItem('credencia_theme', 'dark');
    } else {
      document.documentElement.classList.remove('theme-dark');
      localStorage.setItem('credencia_theme', 'light');
    }
  }, [isDarkTheme]);

  // Load system settings
  useEffect(() => {
    if (currentUser) {
      api.settings.get().then(setSettings).catch(() => {});
    }
  }, [currentUser]);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('credencia_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('credencia_user');
    addToast('info', 'Sessão encerrada com sucesso.');
  };

  const handleNavigateToNew = () => {
    setEditingProposalId(null);
    setViewingProposalId(null);
    setViewingContractId(null);
    setEditingContractId(null);
    setManagingTemplates(false);
    setActiveTab('new-proposal');
  };

  const handleNavigateToList = () => {
    setEditingProposalId(null);
    setViewingProposalId(null);
    setViewingContractId(null);
    setEditingContractId(null);
    setManagingTemplates(false);
    setActiveTab('proposals');
  };

  const handleViewProposal = (id: string) => {
    setViewingProposalId(id);
    setEditingProposalId(null);
    setViewingContractId(null);
    setEditingContractId(null);
    setManagingTemplates(false);
  };

  const handleEditProposal = (id: string) => {
    setEditingProposalId(id);
    setViewingProposalId(null);
    setViewingContractId(null);
    setEditingContractId(null);
    setManagingTemplates(false);
  };

  // Contract handlers
  const handleViewContract = (id: string) => {
    setViewingContractId(id);
    setEditingContractId(null);
    setManagingTemplates(false);
    setViewingProposalId(null);
    setEditingProposalId(null);
  };

  const handleEditContract = (id: string) => {
    setEditingContractId(id);
    setViewingContractId(null);
    setManagingTemplates(false);
    setViewingProposalId(null);
    setEditingProposalId(null);
  };

  const handleBackFromContract = () => {
    setViewingContractId(null);
    setEditingContractId(null);
    setManagingTemplates(false);
    setActiveTab('contracts');
  };

  // If not logged in, show Credencia Login
  if (!currentUser) {
    return (
      <>
        <LoginPage
          onLoginSuccess={handleLoginSuccess}
          onAddToast={addToast}
        />
        {/* Toasts */}
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
          {toasts.map(t => (
            <div
              key={t.id}
              className={`cx-glass px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-semibold select-none ${
                t.type === 'success' ? 'border-emerald-200 text-emerald-900 bg-emerald-50/90' :
                t.type === 'error' ? 'border-rose-200 text-rose-900 bg-rose-50/90' :
                'border-blue-200 text-blue-900 bg-blue-50/90'
              }`}
            >
              <span>{t.message}</span>
            </div>
          ))}
        </div>
      </>
    );
  }

  // Page title mapping
  const getPageTitleAndSubtitle = () => {
    if (viewingContractId) {
      return {
        title: 'Visualização do Contrato',
        subtitle: 'Minuta jurídica oficial com numeração sequencial CTR e conferência de cláusulas'
      };
    }
    if (editingContractId) {
      return {
        title: 'Editor de Cláusulas Contratuais',
        subtitle: 'Edição, reordenação e aplicação de variáveis dinâmicas ao contrato'
      };
    }
    if (managingTemplates) {
      return {
        title: 'Modelos e Minutas de Contrato',
        subtitle: 'Biblioteca padrão de cláusulas jurídicas para contratos de credenciamento'
      };
    }
    if (viewingProposalId) {
      return {
        title: 'Visualização da Proposta',
        subtitle: 'Formato A4 oficial para conferência, impressão e emissão em PDF'
      };
    }
    if (editingProposalId) {
      return {
        title: 'Editar Proposta Comercial',
        subtitle: 'Altere serviços, itens, valores e condições da proposta'
      };
    }
    switch (activeTab) {
      case 'dashboard':
        return {
          title: 'Credencia Orçamentos',
          subtitle: 'Painel geral de propostas e métricas comerciais'
        };
      case 'proposals':
        return {
          title: 'Propostas Comerciais',
          subtitle: 'Listagem e controle de status das propostas emitidas'
        };
      case 'new-proposal':
        return {
          title: 'Nova Proposta Comercial',
          subtitle: 'Criação de proposta com numeração sequencial anual automática'
        };
      case 'contracts':
        return {
          title: 'Contratos e Minutas',
          subtitle: 'Controle de instrumentos contratuais vinculados a propostas aprovadas'
        };
      case 'clients':
        return {
          title: 'Cadastro de Clientes',
          subtitle: 'Base de clientes e dados para faturamento'
        };
      case 'services':
        return {
          title: 'Catálogo de Serviços',
          subtitle: 'Serviços oficiais, unidades de cobrança e valores de tabela'
        };
      case 'settings':
        return {
          title: 'Configurações do Sistema',
          subtitle: 'Dados da empresa, prefixo da numeração e termos contratuais'
        };
      case 'fin-overview':
        return {
          title: 'Visão Geral Financeira',
          subtitle: 'Métricas executivas, contas vencidas e resultados consolidados de eventos'
        };
      case 'fin-receivables':
        return {
          title: 'Contas a Receber',
          subtitle: 'Controle de parcelas, cobranças, baixas e emissão de recibos oficiais'
        };
      case 'fin-payables':
        return {
          title: 'Contas a Pagar',
          subtitle: 'Despesas operacionais por evento, fornecedores, parcelas e pagamentos'
        };
      case 'fin-cash-flow':
        return {
          title: 'Fluxo de Caixa',
          subtitle: 'Projeção cronológica rigorosamente separada em Previsto vs. Realizado'
        };
      case 'fin-events':
        return {
          title: 'Resultado por Evento',
          subtitle: 'DRE operacional e margem de lucro por evento comercial'
        };
      case 'fin-categories':
        return {
          title: 'Categorias Financeiras',
          subtitle: 'Centros de custo e classificação oficial de receitas e despesas operacionais'
        };
      case 'fin-reports':
        return {
          title: 'Relatórios Financeiros',
          subtitle: 'Exportação executiva em PDF e CSV/Excel de receitas, despesas e fluxo'
        };
      default:
        return {
          title: 'Credencia Orçamentos',
          subtitle: 'Sistema de Orçamentos e Contratos Comerciais'
        };
    }
  };

  const { title, subtitle } = getPageTitleAndSubtitle() || {
    title: 'Credencia Orçamentos',
    subtitle: 'Sistema de Orçamentos e Contratos Comerciais'
  };

  return (
    <AppShell
      activeTab={activeTab}
      onSelectTab={(tab) => {
        setViewingProposalId(null);
        setEditingProposalId(null);
        setViewingContractId(null);
        setEditingContractId(null);
        setManagingTemplates(false);
        setActiveTab(tab);
      }}
      pageTitle={title}
      pageSubtitle={subtitle}
      currentUser={currentUser}
      isDarkTheme={isDarkTheme}
      onToggleTheme={() => setIsDarkTheme(prev => !prev)}
      onLogout={handleLogout}
      toasts={toasts}
      onDismissToast={dismissToast}
      onNewProposal={handleNavigateToNew}
    >
      {/* 1. Viewing a Contract (A4 Layout) */}
      {viewingContractId && (
        <ContractViewPage
          contractId={viewingContractId}
          onBack={handleBackFromContract}
          onEditContract={handleEditContract}
          onViewProposal={handleViewProposal}
          onNavigateToFinancial={(_recId) => {
            setViewingContractId(null);
            setActiveTab('fin-receivables');
          }}
          onAddToast={addToast}
          settings={settings}
        />
      )}

      {/* 2. Editing an Existing Contract */}
      {!viewingContractId && editingContractId && (
        <ContractEditorPage
          contractId={editingContractId}
          onBack={() => {
            setEditingContractId(null);
            setViewingContractId(editingContractId);
          }}
          onViewContract={handleViewContract}
          onAddToast={addToast}
          settings={settings}
        />
      )}

      {/* 3. Managing Contract Templates */}
      {!viewingContractId && !editingContractId && managingTemplates && (
        <ContractTemplatesPage
          onBack={() => setManagingTemplates(false)}
          onAddToast={addToast}
        />
      )}

      {/* 4. Viewing a Proposal (A4 Layout) */}
      {!viewingContractId && !editingContractId && !managingTemplates && viewingProposalId && (
        <ProposalViewPage
          proposalId={viewingProposalId}
          onBack={() => setViewingProposalId(null)}
          onEdit={handleEditProposal}
          onViewContract={handleViewContract}
          onAddToast={addToast}
          settings={settings}
        />
      )}

      {/* 5. Editing an Existing Proposal */}
      {!viewingContractId && !editingContractId && !managingTemplates && !viewingProposalId && editingProposalId && (
        <ProposalFormPage
          proposalId={editingProposalId}
          onSaveSuccess={(saved) => {
            setEditingProposalId(null);
            setViewingProposalId(saved.id);
          }}
          onCancel={() => setEditingProposalId(null)}
          onViewProposal={handleViewProposal}
          onAddToast={addToast}
          settings={settings}
        />
      )}

      {/* 6. Regular Navigation Tabs */}
      {!viewingContractId && !editingContractId && !managingTemplates && !viewingProposalId && !editingProposalId && (
        <>
          {activeTab === 'dashboard' && (
            <DashboardPage
              onNavigateToNew={handleNavigateToNew}
              onNavigateToList={handleNavigateToList}
              onViewProposal={handleViewProposal}
              onEditProposal={handleEditProposal}
              onAddToast={addToast}
              settings={settings}
            />
          )}

          {activeTab === 'proposals' && (
            <ProposalsListPage
              onNavigateToNew={handleNavigateToNew}
              onViewProposal={handleViewProposal}
              onEditProposal={handleEditProposal}
              onViewContract={handleViewContract}
              onAddToast={addToast}
              settings={settings}
            />
          )}

          {activeTab === 'contracts' && (
            <ContractsListPage
              onViewContract={handleViewContract}
              onEditContract={handleEditContract}
              onViewProposal={handleViewProposal}
              onAddToast={addToast}
              settings={settings}
            />
          )}

          {activeTab === 'new-proposal' && (
            <ProposalFormPage
              onSaveSuccess={(saved) => {
                setActiveTab('proposals');
                setViewingProposalId(saved.id);
              }}
              onCancel={handleNavigateToList}
              onViewProposal={handleViewProposal}
              onAddToast={addToast}
              settings={settings}
            />
          )}

          {activeTab === 'clients' && (
            <ClientsPage onAddToast={addToast} />
          )}

          {activeTab === 'services' && (
            <ServicesPage onAddToast={addToast} />
          )}

          {activeTab === 'settings' && (
            <SettingsPage
              onAddToast={addToast}
              onSettingsUpdated={setSettings}
              onManageTemplates={() => setManagingTemplates(true)}
            />
          )}

          {/* FINANCIAL MODULE TABS */}
          {activeTab === 'fin-overview' && (
            <FinancialOverviewPage
              onNavigateTab={(tab, filter) => {
                if (filter) setFinancialFilter(filter);
                setActiveTab(tab as NavItemKey);
              }}
              onAddToast={addToast}
            />
          )}

          {activeTab === 'fin-receivables' && (
            <ReceivablesListPage
              initialFilter={financialFilter}
              onViewProposal={handleViewProposal}
              onViewContract={handleViewContract}
              onAddToast={addToast}
            />
          )}

          {activeTab === 'fin-payables' && (
            <PayablesListPage
              initialFilter={financialFilter}
              onAddToast={addToast}
            />
          )}

          {activeTab === 'fin-cash-flow' && (
            <CashFlowPage
              initialViewType="previsto"
              onAddToast={addToast}
            />
          )}

          {activeTab === 'fin-events' && (
            <EventResultPage
              onViewProposal={handleViewProposal}
              onViewContract={handleViewContract}
              onAddToast={addToast}
            />
          )}

          {activeTab === 'fin-categories' && (
            <CategoriesPage onAddToast={addToast} />
          )}

          {activeTab === 'fin-reports' && (
            <FinancialReportsPage onAddToast={addToast} />
          )}
        </>
      )}
    </AppShell>
  );
}

export default App;
