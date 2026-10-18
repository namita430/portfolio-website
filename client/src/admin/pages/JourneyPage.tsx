import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { EXPERIENCE_LABEL, formatDateRange } from '@/lib/format';
import { buttonClasses } from '@/components/ui/Button';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States';
import { adminApi } from '../adminApi';
import { useConfirm, useToast } from '../components/Feedback';
import { MoveButtons } from '../components/RowControls';
import { IconButton, PageHeader, Pill, Switch } from '../components/ui';
import { moveItem, useRefresh } from '../hooks';

export function JourneyPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const refresh = useRefresh();
  const list = useQuery({ queryKey: ['admin', 'experience'], queryFn: adminApi.experience });
  const items = list.data ?? [];

  const run = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => void refresh(),
    onError: (err) => toast.fromError(err),
  });

  async function remove(id: number, title: string) {
    const ok = await confirm({ title: 'Delete this entry?', message: <><strong>{title}</strong> will be removed from your journey timeline.</>, confirmLabel: 'Delete entry', danger: true });
    if (ok) run.mutate(() => adminApi.deleteExperience(id), { onSuccess: () => toast.success('Entry deleted.') });
  }

  return (
    <>
      <PageHeader
        title="Journey"
        description="Training, workshops, internships, jobs and activities, shown as a timeline in the order below. Only add what really happened."
        actions={
          <Link to="/admin/journey/new" className={buttonClasses('primary', 'md')}>
            <Plus className="size-4" aria-hidden="true" /> New entry
          </Link>
        }
      />

      {list.isPending && <Skeleton className="h-64" />}
      {list.isError && <ErrorState error={list.error} onRetry={() => void list.refetch()} />}
      {list.data && items.length === 0 && <EmptyState title="No journey entries yet">Add a training programme, workshop or role to start your timeline.</EmptyState>}

      {items.length > 0 && (
        <ul className="space-y-3">
          {items.map((e, i) => {
            const range = formatDateRange(e.startDate, e.endDate, e.isCurrent);
            return (
              <li key={e.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-surface p-4">
                <div className="min-w-0 flex-1 basis-56">
                  <Link to={`/admin/journey/${e.id}`} className="block truncate font-medium hover:text-accent">
                    {e.title}
                  </Link>
                  <p className="truncate text-xs text-subtle">
                    {e.organization}
                    {e.role ? ` · ${e.role}` : ''}
                    {range ? ` · ${range}` : ' · no dates'}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <Pill tone="muted">{EXPERIENCE_LABEL[e.type]}</Pill>
                    <Pill tone={e.isPublished ? 'good' : 'muted'}>{e.isPublished ? 'Published' : 'Draft'}</Pill>
                  </div>
                </div>
                <Switch id={`jpub-${e.id}`} label={`Published: ${e.title}`} checked={e.isPublished} onChange={(v) => run.mutate(() => adminApi.publishExperience(e.id, v), { onSuccess: () => toast.success(v ? 'Published.' : 'Unpublished.') })} />
                <div className="flex items-center gap-1.5">
                  <MoveButtons name={e.title} index={i} count={items.length} disabled={run.isPending} onMove={(d) => run.mutate(() => adminApi.reorderExperience(moveItem(items, i, d).map((x) => x.id)))} />
                  <Link to={`/admin/journey/${e.id}`} aria-label={`Edit ${e.title}`} className="inline-flex size-9 items-center justify-center rounded-lg border border-line-strong text-muted transition hover:border-accent hover:text-accent">
                    <Pencil className="size-4" aria-hidden="true" />
                  </Link>
                  <IconButton label={`Delete ${e.title}`} className="hover:border-danger hover:text-danger" onClick={() => void remove(e.id, e.title)}>
                    <Trash2 className="size-4" aria-hidden="true" />
                  </IconButton>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
