import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { useProjectFilters, useProjects, useSite } from '@/hooks/usePublicData';
import { Container } from '@/components/ui/Layout';
import { Reveal } from '@/components/ui/Reveal';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States';
import { ProjectCard } from '@/components/projects/ProjectCard';

const PAGE_SIZE = 9;
const selectClass =
  'h-11 min-w-0 flex-1 rounded-xl border border-line-strong bg-bg px-3 text-sm text-fg transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40 sm:flex-none';

export function ProjectsPage() {
  const site = useSite();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const category = params.get('category') ?? '';
  const tag = params.get('tag') ?? '';
  const sort = params.get('sort') === 'newest' ? 'newest' : 'order';
  const page = Math.max(1, Number(params.get('page')) || 1);

  // Debounce typing so we do not request on every keystroke.
  const [draft, setDraft] = useState(q);
  useEffect(() => setDraft(q), [q]);
  useEffect(() => {
    if (draft === q) return;
    const t = setTimeout(() => update({ q: draft, page: '' }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  function update(changes: Record<string, string>) {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    setParams(next, { replace: true });
  }

  const filters = useProjectFilters();
  const projects = useProjects({ page, pageSize: PAGE_SIZE, q: q || undefined, category: category || undefined, tag: tag || undefined, sort });
  const total = projects.data?.meta.total ?? 0;
  const totalPages = projects.data?.meta.totalPages ?? 1;
  const hasFilters = !!(q || category || tag);

  useDocumentMeta({
    title: `Projects — ${site.data?.profile.fullName ?? 'Portfolio'}`,
    description: `Projects built by ${site.data?.profile.fullName ?? 'the developer'}, with source code and live demos.`,
  });

  return (
    <Container className="pb-24 pt-10 sm:pt-14">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted transition hover:text-accent">
        <ArrowLeft className="size-4" aria-hidden="true" /> Home
      </Link>
      <header className="mt-8 max-w-2xl">
        <p className="eyebrow">Projects</p>
        <h1 className="mt-4 font-display text-5xl leading-[1.05] tracking-tight sm:text-6xl">Everything I&rsquo;ve built</h1>
        <p className="mt-5 text-lg text-muted">Search and filter by technology or category. Each project links to its code and, where available, a live demo.</p>
      </header>

      <div className="mt-12 space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <label htmlFor="project-search" className="sr-only">
              Search projects
            </label>
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden="true" />
            <input
              id="project-search"
              type="search"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Search projects…"
              className="h-11 w-full rounded-xl border border-line-strong bg-bg pl-11 pr-4 text-fg placeholder:text-subtle transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>
          <div className="flex gap-3">
            <label className="sr-only" htmlFor="project-tag">
              Filter by technology
            </label>
            <select id="project-tag" className={selectClass} value={tag} onChange={(e) => update({ tag: e.target.value, page: '' })}>
              <option value="">All technologies</option>
              {filters.data?.tags.map((t) => (
                <option key={t.slug} value={t.slug}>
                  {t.name} ({t.count})
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="project-sort">
              Sort projects
            </label>
            <select id="project-sort" className={selectClass} value={sort} onChange={(e) => update({ sort: e.target.value === 'newest' ? 'newest' : '', page: '' })}>
              <option value="order">Featured order</option>
              <option value="newest">Newest first</option>
            </select>
          </div>
        </div>

        {filters.data && filters.data.categories.length > 1 && (
          <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-2">
            {[{ name: '', count: 0 }, ...filters.data.categories].map((c) => (
              <button
                key={c.name || 'all'}
                type="button"
                aria-pressed={category === c.name}
                onClick={() => update({ category: c.name, page: '' })}
                className={cn(
                  'rounded-full border px-4 py-1.5 text-sm transition',
                  category === c.name ? 'border-accent bg-accent text-accent-fg' : 'border-line-strong text-muted hover:border-accent hover:text-accent',
                )}
              >
                {c.name || 'All'}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between text-sm text-muted" role="status" aria-live="polite">
          <p>{projects.isPending ? 'Loading projects…' : `${total} project${total === 1 ? '' : 's'}${hasFilters ? ' match your filters' : ''}`}</p>
          {hasFilters && (
            <button type="button" onClick={() => setParams(new URLSearchParams(), { replace: true })} className="inline-flex items-center gap-1.5 text-accent hover:underline">
              <X className="size-4" aria-hidden="true" /> Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="mt-8">
        {projects.isPending && (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-96" />
            ))}
          </div>
        )}
        {projects.isError && <ErrorState error={projects.error} onRetry={() => void projects.refetch()} />}
        {projects.data && projects.data.data.length === 0 && (
          <EmptyState title={hasFilters ? 'No projects match those filters' : 'No projects published yet'}>
            {hasFilters ? 'Try a different search or clear the filters.' : 'Check back soon.'}
          </EmptyState>
        )}
        {projects.data && projects.data.data.length > 0 && (
          <ul className={cn('grid gap-6 transition-opacity md:grid-cols-2 xl:grid-cols-3', projects.isPlaceholderData && 'opacity-60')}>
            {projects.data.data.map((p, i) => (
              <li key={p.id}>
                <Reveal delay={(i % 3) * 0.06} className="h-full">
                  <ProjectCard project={p} priority={i < 3} />
                </Reveal>
              </li>
            ))}
          </ul>
        )}
      </div>

      {totalPages > 1 && (
        <nav aria-label="Pagination" className="mt-14 flex items-center justify-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => update({ page: String(page - 1) })}
            className="inline-flex size-10 items-center justify-center rounded-full border border-line-strong text-muted transition hover:border-accent hover:text-accent disabled:pointer-events-none disabled:opacity-40"
            aria-label="Previous page"
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => update({ page: n === 1 ? '' : String(n) })}
              aria-current={n === page ? 'page' : undefined}
              aria-label={`Page ${n}`}
              className={cn(
                'inline-flex size-10 items-center justify-center rounded-full border text-sm transition',
                n === page ? 'border-accent bg-accent text-accent-fg' : 'border-line-strong text-muted hover:border-accent hover:text-accent',
              )}
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => update({ page: String(page + 1) })}
            className="inline-flex size-10 items-center justify-center rounded-full border border-line-strong text-muted transition hover:border-accent hover:text-accent disabled:pointer-events-none disabled:opacity-40"
            aria-label="Next page"
          >
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
        </nav>
      )}
    </Container>
  );
}
