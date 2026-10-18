import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertCircle, Award, ExternalLink, FileText, Pencil, Plus, Search, Star, Trash2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatMonthYear, isImage } from '@/lib/format';
import { safeHref } from '@/lib/url';
import { buttonClasses } from '@/components/ui/Button';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States';
import { adminApi } from '../adminApi';
import { useConfirm, useToast } from '../components/Feedback';
import { MoveButtons } from '../components/RowControls';
import { IconButton, Input, PageHeader, Pill, Select, Switch } from '../components/ui';
import { moveItem, useRefresh } from '../hooks';

export function CertificatesPage() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'all' | 'published' | 'draft'>('all');
  const toast = useToast();
  const confirm = useConfirm();
  const refresh = useRefresh();

  const list = useQuery({ queryKey: ['admin', 'certificates', q, status], queryFn: () => adminApi.certificates({ q: q || undefined, status, pageSize: 100 }) });
  const items = list.data?.data ?? [];
  const canReorder = !q && status === 'all';

  const run = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => void refresh(),
    onError: (err) => toast.fromError(err), // e.g. "Upload the certificate file or add a verification URL before publishing it."
  });

  async function remove(id: number, title: string) {
    const ok = await confirm({
      title: 'Delete this certificate?',
      message: (
        <>
          <strong>{title}</strong> and its uploaded file will be removed. This cannot be undone.
        </>
      ),
      confirmLabel: 'Delete certificate',
      danger: true,
    });
    if (ok) run.mutate(() => adminApi.deleteCertificate(id), { onSuccess: () => toast.success('Certificate deleted.') });
  }

  return (
    <>
      <PageHeader
        title="Certificates"
        description="A certificate can only be published once you attach its file or a verification link, so nothing unverified goes public."
        actions={
          <Link to="/admin/certificates/new" className={buttonClasses('primary', 'md')}>
            <Plus className="size-4" aria-hidden="true" /> New certificate
          </Link>
        }
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <label htmlFor="cert-search" className="sr-only">
            Search certificates
          </label>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden="true" />
          <Input id="cert-search" type="search" placeholder="Search by title or issuer…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-10" />
        </div>
        <label className="sr-only" htmlFor="cert-status">
          Filter by status
        </label>
        <Select id="cert-status" value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="sm:w-44">
          <option value="all">All certificates</option>
          <option value="published">Published</option>
          <option value="draft">Drafts</option>
        </Select>
      </div>
      {!canReorder && <p className="mb-4 text-sm text-subtle">Clear the search and filter to reorder.</p>}

      {list.isPending && <Skeleton className="h-64" />}
      {list.isError && <ErrorState error={list.error} onRetry={() => void list.refetch()} />}
      {list.data && items.length === 0 && <EmptyState title={q || status !== 'all' ? 'No certificates match' : 'No certificates yet'}>Add a certificate, attach its file, and publish it.</EmptyState>}

      {items.length > 0 && (
        <ul className="space-y-3">
          {items.map((c, i) => {
            const preview = c.thumbnail ?? (c.file && isImage(c.file.mimeType) ? c.file : null);
            const fileHref = safeHref(c.file?.url);
            const hasEvidence = !!(c.file || c.verificationUrl);
            return (
              <li key={c.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-surface p-4">
                <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-surface-2 text-accent/80">
                  {preview ? <img src={preview.url} alt="" className="size-full object-cover" /> : c.file ? <FileText className="size-7" aria-hidden="true" /> : <Award className="size-7" aria-hidden="true" />}
                </div>
                <div className="min-w-0 flex-1 basis-56">
                  <Link to={`/admin/certificates/${c.id}`} className="block truncate font-medium hover:text-accent">
                    {c.title}
                  </Link>
                  <p className="truncate text-xs text-subtle">
                    {c.issuer} · {c.category}
                    {c.issueDate ? ` · ${formatMonthYear(c.issueDate)}` : ''}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <Pill tone={c.isPublished ? 'good' : 'muted'}>{c.isPublished ? 'Published' : 'Draft'}</Pill>
                    {c.isFeatured && <Pill tone="warn">Featured</Pill>}
                    {!hasEvidence && (
                      <span className="inline-flex items-center gap-1 text-xs text-accent">
                        <AlertCircle className="size-3.5" aria-hidden="true" /> Needs a file or verification link
                      </span>
                    )}
                  </div>
                </div>

                <Switch id={`cpub-${c.id}`} label={`Published: ${c.title}`} checked={c.isPublished} onChange={(v) => run.mutate(() => adminApi.publishCertificate(c.id, v), { onSuccess: () => toast.success(v ? 'Published.' : 'Unpublished.') })} />

                <div className="flex items-center gap-1.5">
                  <IconButton label={c.isFeatured ? `Unfeature ${c.title}` : `Feature ${c.title}`} aria-pressed={c.isFeatured} className={cn(c.isFeatured && 'border-accent text-accent')} onClick={() => run.mutate(() => adminApi.featureCertificate(c.id, !c.isFeatured))}>
                    <Star className={cn('size-4', c.isFeatured && 'fill-current')} aria-hidden="true" />
                  </IconButton>
                  <MoveButtons name={c.title} index={i} count={items.length} disabled={!canReorder || run.isPending} onMove={(d) => run.mutate(() => adminApi.reorderCertificates(moveItem(items, i, d).map((x) => x.id)))} />
                  {fileHref && (
                    <a href={fileHref} target="_blank" rel="noopener noreferrer" aria-label={`Open file for ${c.title} (opens in a new tab)`} className="inline-flex size-9 items-center justify-center rounded-lg border border-line-strong text-muted transition hover:border-accent hover:text-accent">
                      <ExternalLink className="size-4" aria-hidden="true" />
                    </a>
                  )}
                  <Link to={`/admin/certificates/${c.id}`} aria-label={`Edit ${c.title}`} className="inline-flex size-9 items-center justify-center rounded-lg border border-line-strong text-muted transition hover:border-accent hover:text-accent">
                    <Pencil className="size-4" aria-hidden="true" />
                  </Link>
                  <IconButton label={`Delete ${c.title}`} className="hover:border-danger hover:text-danger" onClick={() => void remove(c.id, c.title)}>
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
