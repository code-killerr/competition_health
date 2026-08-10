import React from 'react';
import { cn } from '@/lib/utils';

interface PanelProps {
  label?: string;
  title?: string;
  tag?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}

const Panel: React.FC<PanelProps> = ({ label, title, tag, className, bodyClassName, children }) => {
  return (
    <article className={cn('panel-surface flex flex-col rounded-xl shadow-card', className)}>
      {(label || title || tag) && (
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            {label && (
              <span className="font-mono-data text-[10px] uppercase tracking-widest text-muted-foreground">
                {label}
              </span>
            )}
            {title && <h3 className="mt-1 text-balance text-base font-semibold text-foreground">{title}</h3>}
          </div>
          {tag && <div className="shrink-0">{tag}</div>}
        </div>
      )}
      <div className={cn('flex-1 p-5', bodyClassName)}>{children}</div>
    </article>
  );
};

export default Panel;