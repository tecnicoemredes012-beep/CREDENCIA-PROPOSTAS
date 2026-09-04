import React from 'react';
import { Sun, Moon, LogOut, Plus, Menu } from 'lucide-react';
import { User } from '../../types';
import { Button } from '../ui/Button';

interface HeaderProps {
  title: string;
  subtitle?: string;
  currentUser: User | null;
  isDarkTheme: boolean;
  onToggleTheme: () => void;
  onLogout: () => void;
  onNewProposal?: () => void;
  onOpenMobileMenu?: () => void;
}

export function Header({
  title,
  subtitle,
  currentUser,
  isDarkTheme,
  onToggleTheme,
  onLogout,
  onNewProposal,
  onOpenMobileMenu
}: HeaderProps) {
  const initials = (currentUser?.name || 'AD')
    .split(' ')
    .slice(0, 2)
    .map(p => p[0])
    .join('')
    .toUpperCase();

  return (
    <header className="cx-premium-header no-print sticky top-0 z-20 shrink-0 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
      <div className="flex h-18 items-center justify-between px-4 lg:px-8">
        {/* Left side: Mobile menu toggle + Page title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            title="Abrir menu"
          >
            <Menu size={20} />
          </button>

          <div>
            <h1 className="font-display text-lg lg:text-xl font-extrabold text-slate-900 tracking-tight leading-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs text-slate-500 font-medium hidden sm:block">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right side: Actions, Theme, User profile */}
        <div className="flex items-center gap-3">
          {onNewProposal && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus size={15} />}
              onClick={onNewProposal}
              className="hidden sm:inline-flex"
            >
              Nova Proposta
            </Button>
          )}

          {/* Theme switcher */}
          <button
            onClick={onToggleTheme}
            className="cx-button-secondary inline-flex items-center justify-center w-9 h-9 rounded-xl text-slate-700 cursor-pointer"
            title={isDarkTheme ? 'Usar tema claro' : 'Usar tema escuro'}
          >
            {isDarkTheme ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* User profile badge */}
          <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-slate-200/80 bg-white/70 backdrop-blur-xs">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-900 font-bold text-xs flex items-center justify-center">
              {initials}
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-slate-900 leading-none max-w-[130px] truncate">
                {currentUser?.name || 'Administrador'}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 font-semibold">
                {currentUser?.role || 'Comercial'}
              </div>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={onLogout}
            className="cx-button-secondary inline-flex items-center justify-center w-9 h-9 sm:w-auto sm:px-3 rounded-xl text-slate-600 hover:text-rose-600 hover:border-rose-200 transition cursor-pointer text-xs font-semibold gap-1.5"
            title="Sair do sistema"
          >
            <LogOut size={15} />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </div>
    </header>
  );
}
