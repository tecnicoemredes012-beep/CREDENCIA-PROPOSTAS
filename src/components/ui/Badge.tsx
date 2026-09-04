import React from 'react';

export type BadgeTone = 'success' | 'neutral' | 'warning' | 'danger' | 'premium' | 'info' | 'purple' | 'orange';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  className?: string;
  children?: React.ReactNode;
}

const toneClasses: Record<BadgeTone, string> = {
  success: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-extrabold',
  neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  danger: 'bg-rose-50 text-rose-700 border-rose-200',
  premium: 'cx-badge',
  info: 'bg-blue-50 text-blue-700 border-blue-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
  orange: 'bg-orange-50 text-orange-800 border-orange-200'
};

export function Badge({ tone = 'premium', className = '', children, ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] select-none ${toneClasses[tone]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
