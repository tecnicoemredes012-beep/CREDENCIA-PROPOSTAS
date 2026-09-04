import React, { useState } from 'react';
import { Sidebar, NavItemKey } from './Sidebar';
import { Header } from './Header';
import { ToastContainer } from './ToastContainer';
import { Toast, User } from '../../types';
import { X } from 'lucide-react';

interface AppShellProps {
  activeTab: NavItemKey;
  onSelectTab: (tab: NavItemKey) => void;
  pageTitle: string;
  pageSubtitle?: string;
  currentUser: User | null;
  isDarkTheme: boolean;
  onToggleTheme: () => void;
  onLogout: () => void;
  toasts: Toast[];
  onDismissToast?: (id: string) => void;
  onNewProposal?: () => void;
  children: React.ReactNode;
}

export function AppShell({
  activeTab,
  onSelectTab,
  pageTitle,
  pageSubtitle,
  currentUser,
  isDarkTheme,
  onToggleTheme,
  onLogout,
  toasts,
  onDismissToast,
  onNewProposal,
  children
}: AppShellProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSelectTab = (tab: NavItemKey) => {
    onSelectTab(tab);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className={`cx-app-shell min-h-screen text-slate-900 flex print:block print:min-h-0 print:h-auto print:bg-white print:overflow-visible ${isDarkTheme ? 'theme-dark bg-[#0B1120]' : 'bg-[#f7f7f2]'}`}>
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={onDismissToast} />

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex shrink-0 print:hidden">
        <Sidebar
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed(prev => !prev)}
        />
      </div>

      {/* Mobile Drawer Backdrop and Sidebar */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden print:hidden">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative flex w-72 flex-col bg-white shadow-2xl z-10">
            <div className="absolute top-4 right-4 z-20">
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            <Sidebar
              activeTab={activeTab}
              onSelectTab={handleSelectTab}
              isCollapsed={false}
              onToggleCollapse={() => {}}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden print:block print:w-full print:overflow-visible print:h-auto">
        <Header
          title={pageTitle}
          subtitle={pageSubtitle}
          currentUser={currentUser}
          isDarkTheme={isDarkTheme}
          onToggleTheme={onToggleTheme}
          onLogout={onLogout}
          onNewProposal={activeTab !== 'new-proposal' ? onNewProposal : undefined}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 print:block print:w-full print:overflow-visible print:p-0 print:m-0 print:h-auto">
          <div className="mx-auto max-w-7xl print:max-w-none print:w-full print:m-0 print:p-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
