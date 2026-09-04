import React from 'react';

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`cx-skeleton rounded-xl ${className}`} />;
}

export function LoadingState({ label = 'Carregando informações...' }: { label?: string }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-center p-8">
      <div className="h-10 w-10 rounded-full border-2 border-emerald-100 border-t-[#12e000] animate-spin" />
      <p className="text-sm font-semibold text-slate-500">{label}</p>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="cx-empty-state flex min-h-[220px] flex-col items-center justify-center gap-3 p-8 text-center">
      {icon && <div className="text-slate-400 mb-1">{icon}</div>}
      <h3 className="font-display text-base font-bold text-slate-900">{title}</h3>
      {description && <p className="max-w-md text-xs text-slate-500 leading-relaxed">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
