import React from 'react';
import { ContractStatus } from '../../types/contract';
import {
  FileEdit,
  Clock,
  CheckCircle2,
  Send,
  Eye,
  FileCheck2,
  Zap,
  XCircle,
  Archive,
  RefreshCw
} from 'lucide-react';

interface ContractStatusBadgeProps {
  status: ContractStatus;
  size?: 'sm' | 'md';
}

const statusConfig: Record<ContractStatus, { label: string; bg: string; text: string; border: string; icon: any }> = {
  draft: {
    label: 'Rascunho',
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-300',
    icon: FileEdit
  },
  in_review: {
    label: 'Em Revisão',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-300',
    icon: Clock
  },
  finalized: {
    label: 'Finalizado',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-300',
    icon: CheckCircle2
  },
  sent: {
    label: 'Enviado',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-300',
    icon: Send
  },
  viewed: {
    label: 'Visualizado',
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-300',
    icon: Eye
  },
  signed: {
    label: 'Assinado',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-400',
    icon: FileCheck2
  },
  active: {
    label: 'Ativo',
    bg: 'bg-emerald-100/90',
    text: 'text-emerald-950',
    border: 'border-[#12e000]',
    icon: Zap
  },
  cancelled: {
    label: 'Cancelado',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-300',
    icon: XCircle
  },
  closed: {
    label: 'Encerrado',
    bg: 'bg-slate-200/80',
    text: 'text-slate-700',
    border: 'border-slate-400',
    icon: Archive
  },
  replaced: {
    label: 'Substituído',
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-300',
    icon: RefreshCw
  }
};

export function ContractStatusBadge({ status, size = 'md' }: ContractStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.draft;
  const Icon = config.icon;

  const sizeClasses = size === 'sm'
    ? 'text-[10px] px-2 py-0.5 gap-1'
    : 'text-xs px-2.5 py-1 gap-1.5 font-bold';

  return (
    <span
      className={`inline-flex items-center rounded-full border ${config.bg} ${config.text} ${config.border} ${sizeClasses} shadow-2xs font-semibold tracking-wide`}
    >
      <Icon size={size === 'sm' ? 12 : 14} />
      <span>{config.label}</span>
    </span>
  );
}
