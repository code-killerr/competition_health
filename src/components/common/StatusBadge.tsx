import React from 'react';
import { cn } from '@/lib/utils';

type Tone = 'pass' | 'pending' | 'fail' | 'info' | 'neutral';

const toneClass: Record<Tone, string> = {
  pass: 'border-primary/40 bg-primary/10 text-primary',
  pending: 'border-warning/40 bg-warning/10 text-warning',
  fail: 'border-destructive/40 bg-destructive/10 text-destructive',
  info: 'border-accent/40 bg-accent/10 text-accent',
  neutral: 'border-border bg-secondary text-muted-foreground',
};

interface StatusBadgeProps {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ tone = 'neutral', className, children }) => {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono-data text-[10px] font-semibold uppercase tracking-wide',
        toneClass[tone],
        className
      )}
    >
      {children}
    </span>
  );
};

export default StatusBadge;