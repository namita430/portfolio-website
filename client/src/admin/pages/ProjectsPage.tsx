import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ExternalLink, Pencil, Plus, Search, Star, Trash2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { STATUS_LABEL } from '@/lib/format';
import { buttonClasses } from '@/components/ui/Button';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States';
import { adminApi } from '../adminApi';
import { useConfirm, useToast } from '../components/Feedback';
import { MoveButtons } from '../components/RowControls';
import { IconButton, Input, PageHeader, Pill, Select, Switch } from '../components/ui';
import { moveItem, useRefresh } from '../hooks';

export function ProjectsPage() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'all' | 'published' | 'draft'>('all');
  const toast = useToast();
  const confirm = useConfirm();
  const refresh = useRefresh();

  const list = useQuery({ queryKey: ['admin', 'projects', q, status], queryFn: () => adminApi.projects({ q: q || undefined, status, pageSize: 100 }) });
  const items = list.data?.data ?? [];
  const canReorder = !q && status === 'all';

  const run = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => void refresh(),
    onError: (err) => toast.fromError(err),
  });

  async function remove(id: number, title: string) {
    const ok = await confirm({
      title: 'Delete this project?',
      message: (
        <>
          <strong>{title}</strong> will be removed from the website, along with its uploaded images. This cannot be undone.
        </>
      ),
      confirmLabel: 'Delete project',
      danger: true,
    });
    if (ok) run.mutate(() => adminApi.deleteProject(id), { onSuccess: () => toast.success('Project deleted.') });
  }

  return (
    <>
      <PageHeader
        title="Projects"
        description="Add, edit, reorder and publish projects. Only published projects appear on the website."
        actions={
          <Link to="/admin/projects/new" className={buttonClasses('primary', 'md')}>
            <Plus className="size-4" aria-hidden="true" /> New project
          </Link>
        }
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <label htmlFor="proj-search" className="sr-only">
            Search projects
          </label>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden="true" />
          <Input id="proj-search" type="search" placeholder="Search by title, category or slug…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-10" />
        </div>
        <label className="sr-only" htmlFor="proj-status">
          Filter by status
        </label>
        <Select id="proj-status" value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="sm:w-44">
          <option value="all">All projects</option>
          <option value="published">Published</option>
          <option value="draft">Drafts</option>
        </Select>
      </div>
      {!canReorder && <p className="mb-4 text-sm text-subtle">Clear the search and filter to reorder projects.</p>}

      {list.isPending && <Skeleton className="h-64" />}
      {list.isError && <ErrorState error={list.error} onRetry={() => void list.refetch()} />}
      {list.data && items.length === 0 && (
        <EmptyState title={q || status !== 'all' ? 'No projects match' : 'No projects yet'}>
          {q || status !== 'all' ? 'Try a different search or filter.' : 'Create your first project to show it on the website.'}
        </EmptyState>
      )}

      {items.length > 0 && (
        <ul className="space-y-3">
          {items.map((p, i) => (
            <li key={p.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-surface p-4">
              <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-surface-2 font-display text-xl italic text-accent/80">
                {p.coverImage ? <img src={p.coverImage.url} alt="" className="size-full object-cover" /> : <span aria-hidden="true">{p.title.slice(0, 2)}</span>}
              </div>

              <div className="min-w-0 flex-1 basis-56">
                <Link to={`/admin/projects/${p.id}`} className="block truncate font-medium hover:text-accent">
                  {p.title}
                </Link>
                <p className="truncate text-xs text-subtle">
                  /{p.slug} · {p.category} · {STATUS_LABEL[p.status]}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <Pill tone={p.isPublished ? 'good' : 'muted'}>{p.isPublished ? 'Published' : 'Draft'}</Pill>
                  {p.isFeatured && <Pill tone="warn">Featured</Pill>}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Switch id={`pub-${p.id}`} label={`Published: ${p.title}`} checked={p.isPublished} onChange={(v) => run.mutate(() => adminApi.publishProject(p.id, v), { onSuccess: () => toast.success(v ? 'Published.' : 'Unpublished.') })} />
              </div>

              <div className="flex items-center gap-1.5">
                <IconButton
                  label={p.isFeatured ? `Unfeature ${p.title}` : `Feature ${p.title}`}
                  aria-pressed={p.isFeatured}
                  className={cn(p.isFeatured && 'border-accent text-accent')}
                  onClick={() => run.mutate(() => adminApi.featureProject(p.id, !p.isFeatured))}
                >
                  <Star className={cn('size-4', p.isFeatured && 'fill-current')} aria-hidden="true" />
                </IconButton>
                <MoveButtons
                  name={p.title}
                  index={i}
                  count={items.length}
                  disabled={!canReorder || run.isPending}
                  onMove={(d) => run.mutate(() => adminApi.reorderProjects(moveItem(items, i, d).map((x) => x.id)))}
                />
                {p.isPublished && (
                  <Link to={`/projects/${p.slug}`} target="_blank" aria-label={`View ${p.title} on the website (opens in a new tab)`} className="inline-flex size-9 items-center justify-center rounded-lg border border-line-strong text-muted transition hover:border-accent hover:text-accent">
                    <ExternalLink className="size-4" aria-hidden="true" />
                  </Link>
                )}
                <Link to={`/admin/projects/${p.id}`} aria-label={`Edit ${p.title}`} className="inline-flex size-9 items-center justify-center rounded-lg border border-line-strong text-muted transition hover:border-accent hover:text-accent">
                  <Pencil className="size-4" aria-hidden="true" />
                </Link>
                <IconButton label={`Delete ${p.title}`} className="hover:border-danger hover:text-danger" onClick={() => void remove(p.id, p.title)}>
                  <Trash2 className="size-4" aria-hidden="true" />
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
