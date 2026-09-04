import React from 'react';
import {
  LayoutDashboard,
  FileText,
  FilePlus,
  Users,
  Layers,
  Settings,
  FileSignature,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import credenciaLogoLockup from '../../assets/credencia-logo-lockup.png';
import credenciaLogoIcon from '../../assets/credencia-logo-icon.png';

export type NavItemKey = 'dashboard' | 'proposals' | 'new-proposal' | 'contracts' | 'clients' | 'services' | 'settings';

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
  const items: NavItem[] = [
    { id: 'dashboard', label: 'Painel Inicial', icon: LayoutDashboard },
    { id: 'proposals', label: 'Propostas', icon: FileText },
    { id: 'new-proposal', label: 'Nova Proposta', icon: FilePlus },
    { id: 'contracts', label: 'Contratos', icon: FileSignature },
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
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition select-none cursor-pointer ${
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
