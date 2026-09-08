import React, { useState } from 'react';
import {
  LayoutDashboard,
  FileText,
  FilePlus,
  Users,
  Layers,
  Settings,
  FileSignature,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  PieChart,
  Tag,
  FileSpreadsheet
} from 'lucide-react';
import credenciaLogoLockup from '../../assets/credencia-logo-lockup.png';
import credenciaLogoIcon from '../../assets/credencia-logo-icon.png';

export type NavItemKey =
  | 'dashboard'
  | 'proposals'
  | 'new-proposal'
  | 'contracts'
  | 'clients'
  | 'services'
  | 'settings'
  | 'fin-overview'
  | 'fin-receivables'
  | 'fin-payables'
  | 'fin-cash-flow'
  | 'fin-events'
  | 'fin-categories'
  | 'fin-reports';

interface SidebarProps {
  activeTab: NavItemKey;
  onSelectTab: (tab: NavItemKey) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

interface NavItem {
  id: NavItemKey;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge?: string | number;
}

export function Sidebar({
  activeTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse
}: SidebarProps) {
  const isFinancialActive = activeTab.startsWith('fin-');
  const [financialExpanded, setFinancialExpanded] = useState<boolean>(true);

  const mainItems: NavItem[] = [
    { id: 'dashboard', label: 'Painel Inicial', icon: LayoutDashboard },
    { id: 'proposals', label: 'Propostas', icon: FileText },
    { id: 'new-proposal', label: 'Nova Proposta', icon: FilePlus },
    { id: 'contracts', label: 'Contratos', icon: FileSignature },
  ];

  const financialItems: NavItem[] = [
    { id: 'fin-overview', label: 'Visão Geral', icon: DollarSign },
    { id: 'fin-receivables', label: 'Contas a Receber', icon: ArrowUpRight },
    { id: 'fin-payables', label: 'Contas a Pagar', icon: ArrowDownRight },
    { id: 'fin-cash-flow', label: 'Fluxo de Caixa', icon: TrendingUp },
    { id: 'fin-events', label: 'Resultado por Evento', icon: Layers },
    { id: 'fin-categories', label: 'Categorias', icon: Tag },
    { id: 'fin-reports', label: 'Relatórios', icon: FileSpreadsheet },
  ];

  const bottomItems: NavItem[] = [
    { id: 'clients', label: 'Clientes', icon: Users },
    { id: 'services', label: 'Serviços', icon: Layers },
    { id: 'settings', label: 'Configurações', icon: Settings }
  ];

  return (
    <aside
      className={`cx-app-sidebar no-print shrink-0 flex flex-col border-r border-slate-200/80 bg-white/80 backdrop-blur-md transition-all duration-250 z-30 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Top Brand Logo */}
      <div className="flex h-18 items-center justify-between px-4 border-b border-slate-200/60">
        <button
          onClick={() => onSelectTab('dashboard')}
          className="flex items-center gap-2.5 overflow-hidden text-left cursor-pointer"
        >
          {isCollapsed ? (
            <img src={credenciaLogoIcon} alt="Credencia" className="h-9 w-auto object-contain shrink-0 mx-auto" />
          ) : (
            <div className="flex flex-col">
              <img src={credenciaLogoLockup} alt="Credencia" className="h-8 w-auto object-contain" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-800 -mt-0.5 pl-0.5">
                Orçamentos
              </span>
            </div>
          )}
        </button>

        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          title={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        {/* Main Items */}
        {mainItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm font-semibold transition select-none cursor-pointer ${
                isActive
                  ? 'cx-nav-active'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100/80'
              } ${isCollapsed ? 'justify-center px-2' : ''}`}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon size={18} className={`shrink-0 ${isActive ? 'text-[#12e000]' : 'text-slate-500'}`} />
              {!isCollapsed && (
                <span className="truncate flex-1 text-left">{item.label}</span>
              )}
              {!isCollapsed && item.badge && (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-full">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Separator / Financial Group */}
        <div className="pt-2">
          {!isCollapsed ? (
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setFinancialExpanded(prev => !prev)}
                className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-sm font-bold select-none cursor-pointer transition ${
                  isFinancialActive
                    ? 'text-emerald-900 bg-emerald-50/60 font-extrabold'
                    : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <DollarSign size={18} className="text-[#0a8900] shrink-0" />
                  <span>Financeiro</span>
                </div>
                {financialExpanded ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
              </button>

              {/* Collapsible Submenu */}
              {financialExpanded && (
                <div className="pl-4 pr-1 py-1 space-y-1 border-l-2 border-emerald-300 ml-5 my-1">
                  {financialItems.map((sub) => {
                    const SubIcon = sub.icon;
                    const isSubActive = activeTab === sub.id;
                    return (
                      <button
                        key={sub.id}
                        onClick={() => onSelectTab(sub.id)}
                        className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition select-none cursor-pointer ${
                          isSubActive
                            ? 'bg-emerald-100 text-emerald-950 font-bold'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                        }`}
                      >
                        <SubIcon size={14} className={isSubActive ? 'text-emerald-700' : 'text-slate-400'} />
                        <span className="truncate">{sub.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Collapsed Financial Button */
            <button
              onClick={() => onSelectTab('fin-overview')}
              className={`w-full flex items-center justify-center p-2.5 rounded-xl transition cursor-pointer ${
                isFinancialActive
                  ? 'cx-nav-active'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
              title="Módulo Financeiro"
            >
              <DollarSign size={18} className={isFinancialActive ? 'text-[#12e000]' : 'text-slate-500'} />
            </button>
          )}
        </div>

        {/* Bottom Items */}
        <div className="pt-2 border-t border-slate-100">
          {bottomItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm font-semibold transition select-none cursor-pointer ${
                  isActive
                    ? 'cx-nav-active'
                    : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100/80'
                } ${isCollapsed ? 'justify-center px-2' : ''}`}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon size={18} className={`shrink-0 ${isActive ? 'text-[#12e000]' : 'text-slate-500'}`} />
                {!isCollapsed && (
                  <span className="truncate flex-1 text-left">{item.label}</span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Footer info */}
      <div className="p-3 border-t border-slate-200/60 text-center">
        {!isCollapsed ? (
          <div className="text-[11px] font-medium text-slate-400">
            Módulo Credencia v1.0
          </div>
        ) : (
          <div className="w-2 h-2 rounded-full bg-emerald-500 mx-auto" title="Sistema Online" />
        )}
      </div>
    </aside>
  );
}

