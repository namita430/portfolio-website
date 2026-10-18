import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { STATUS_LABEL } from '@/lib/format';
import type { ProjectStatus } from '@/types/api';

export function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-md border border-line bg-surface-2/60 px-2 py-0.5 font-mono text-[0.72rem] text-muted', className)}>
      {children}
    </span>
  );
}

const statusTone: Record<ProjectStatus, string> = {
  CONCEPT: 'border-line-strong text-muted',
  IN_PROGRESS: 'border-accent/50 text-accent bg-accent-soft',
  LIVE_DEMO: 'border-success/50 text-success bg-success/10',
  COMPLETED: 'border-success/50 text-success bg-success/10',
  ARCHIVED: 'border-line-strong text-subtle',
};

export function StatusBadge({ status, className }: { status: ProjectStatus; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[0.7rem] uppercase tracking-wider', statusTone[status], className)}>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {STATUS_LABEL[status]}
    </span>
  );
}
