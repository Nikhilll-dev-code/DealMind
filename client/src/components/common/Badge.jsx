import React from 'react';
import { CheckCircle2, XCircle, Clock, AlertTriangle, ShieldCheck, Sparkles, ShieldAlert } from 'lucide-react';

export default function Badge({
  children,
  variant = 'default',
  size = 'md',
  icon: CustomIcon,
  className = ''
}) {
  const variants = {
    default: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    primary: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
    success: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
    warning: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
    danger: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30',
    purple: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-xs font-bold'
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold border ${variants[variant] || variants.default} ${sizes[size] || sizes.md} ${className}`}>
      {CustomIcon && <CustomIcon className="w-3 h-3 shrink-0" />}
      <span>{children}</span>
    </span>
  );
}

export function ConfidenceBadge({ confidence = 'LOW', tierLabel = null }) {
  const conf = (confidence || 'LOW').toUpperCase();
  const config = {
    HIGH: { variant: 'success', icon: ShieldCheck, label: 'HIGH CONFIDENCE' },
    MEDIUM: { variant: 'warning', icon: Sparkles, label: 'MEDIUM CONFIDENCE' },
    LOW: { variant: 'danger', icon: AlertTriangle, label: 'LOW CONFIDENCE' }
  }[conf] || { variant: 'danger', icon: AlertTriangle, label: `${conf} CONFIDENCE` };

  return (
    <div className="inline-flex items-center gap-2">
      <Badge variant={config.variant} icon={config.icon} size="md">
        {config.label}
      </Badge>
      {tierLabel && (
        <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
          {tierLabel}
        </span>
      )}
    </div>
  );
}

export function OutcomeBadge({ outcome = 'PENDING' }) {
  const out = (outcome || 'PENDING').toUpperCase();
  if (out === 'WON') {
    return <Badge variant="success" icon={CheckCircle2} size="sm">WON</Badge>;
  }
  if (out === 'LOST') {
    return <Badge variant="danger" icon={XCircle} size="sm">LOST</Badge>;
  }
  return <Badge variant="default" icon={Clock} size="sm">PENDING</Badge>;
}

export function ApprovalStatusBadge({ status = 'PENDING' }) {
  const stat = (status || 'PENDING').toUpperCase();
  if (stat === 'APPROVED') {
    return <Badge variant="success" icon={CheckCircle2} size="sm">APPROVED</Badge>;
  }
  if (stat === 'REJECTED') {
    return <Badge variant="danger" icon={XCircle} size="sm">REJECTED</Badge>;
  }
  if (stat === 'MODIFIED') {
    return <Badge variant="primary" icon={Sparkles} size="sm">MODIFIED</Badge>;
  }
  return <Badge variant="warning" icon={ShieldAlert} size="sm">PENDING APPROVAL</Badge>;
}
