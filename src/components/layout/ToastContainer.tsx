import React from 'react';
import { Toast } from '../../types';
import { CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss?: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none no-print">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';
        const isWarning = toast.type === 'warning';

        return (
          <div
            key={toast.id}
            onClick={() => onDismiss?.(toast.id)}
            className={`pointer-events-auto cx-glass px-4 py-3 rounded-2xl flex items-center gap-3 text-xs sm:text-sm font-semibold shadow-xl select-none transition duration-200 cursor-pointer ${
              isSuccess
                ? 'border-emerald-200 bg-emerald-50/90 text-emerald-950'
                : isError
                ? 'border-rose-200 bg-rose-50/90 text-rose-950'
                : isWarning
                ? 'border-amber-200 bg-amber-50/90 text-amber-950'
                : 'border-blue-200 bg-blue-50/90 text-blue-950'
            }`}
          >
            {isSuccess && <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />}
            {isError && <AlertCircle size={18} className="text-rose-600 shrink-0" />}
            {isWarning && <AlertTriangle size={18} className="text-amber-600 shrink-0" />}
            {!isSuccess && !isError && !isWarning && <Info size={18} className="text-blue-600 shrink-0" />}
            <span className="flex-1 leading-snug">{toast.message}</span>
          </div>
        );
      })}
    </div>
  );
}
