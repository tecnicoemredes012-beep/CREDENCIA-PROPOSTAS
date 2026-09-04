import React from 'react';

export interface FieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}

export function Field({ label, required, hint, error, className = '', children }: FieldProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      {children}
      {(hint || error) && (
        <span className={`block text-xs font-medium ${error ? 'text-rose-600' : 'text-slate-400'}`}>
          {error || hint}
        </span>
      )}
    </div>
  );
}

export const inputClassName =
  'w-full rounded-xl border border-slate-200 bg-white/90 px-3.5 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none backdrop-blur-xs transition duration-150 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-55 disabled:bg-slate-50';

export const selectClassName =
  'w-full rounded-xl border border-slate-200 bg-white/90 px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none backdrop-blur-xs transition duration-150 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-55 disabled:bg-slate-50 cursor-pointer';

export const textareaClassName =
  'w-full rounded-xl border border-slate-200 bg-white/90 px-3.5 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none backdrop-blur-xs transition duration-150 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-55 disabled:bg-slate-50 resize-y';
