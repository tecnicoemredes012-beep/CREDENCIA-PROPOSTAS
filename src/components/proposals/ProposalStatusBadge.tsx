import React from 'react';
import { ProposalStatus } from '../../types';
import { Badge, BadgeTone } from '../ui/Badge';
import { Clock, CheckCircle2, XCircle, Send, AlertTriangle, FileText, Ban } from 'lucide-react';

interface StatusConfig {
  label: string;
  tone: BadgeTone;
  icon: React.ReactNode;
}

const statusMap: Record<ProposalStatus, StatusConfig> = {
  draft: {
    label: 'Rascunho',
    tone: 'neutral',
    icon: <FileText size={11} />
  },
  generated: {
    label: 'Gerada',
    tone: 'info',
    icon: <FileText size={11} />
  },
  sent: {
    label: 'Enviada',
    tone: 'purple',
    icon: <Send size={11} />
  },
  negotiating: {
    label: 'Em negociação',
    tone: 'warning',
    icon: <Clock size={11} />
  },
  approved: {
    label: 'Aprovada',
    tone: 'success',
    icon: <CheckCircle2 size={11} />
  },
  rejected: {
    label: 'Recusada',
    tone: 'danger',
    icon: <XCircle size={11} />
  },
  cancelled: {
    label: 'Cancelada',
    tone: 'neutral',
    icon: <Ban size={11} />
  },
  expired: {
    label: 'Vencida',
    tone: 'orange',
    icon: <AlertTriangle size={11} />
  }
};

export function ProposalStatusBadge({ status, className = '' }: { status: ProposalStatus; className?: string }) {
  const config = statusMap[status] || statusMap.draft;
  return (
    <Badge tone={config.tone} className={`gap-1.5 ${className}`}>
      {config.icon}
      <span>{config.label}</span>
    </Badge>
  );
}

export function getStatusLabel(status: ProposalStatus): string {
  return statusMap[status]?.label || status;
}
