import React from 'react';
import type { IconType } from 'react-icons';

interface StatCardProps {
  icon: IconType;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  /** Extra content under the value, e.g. a progress bar. */
  children?: React.ReactNode;
}

/** One headline number on a dashboard: label, value and a short line of context. */
export const StatCard: React.FC<StatCardProps> = ({ icon: Icon, label, value, sub, children }) => (
  <div className="rounded-xl border border-border bg-card p-5">
    <div className="flex items-center gap-2 text-muted-foreground">
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <p className="text-sm font-medium">{label}</p>
    </div>
    <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground tabular-nums break-words">{value}</p>
    {children}
    {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
  </div>
);

export const StatCardSkeleton: React.FC = () => (
  <div className="rounded-xl border border-border bg-card p-5 space-y-3 animate-pulse">
    <div className="h-4 w-28 rounded bg-muted" />
    <div className="h-7 w-32 rounded bg-muted" />
    <div className="h-3 w-40 rounded bg-muted" />
  </div>
);
