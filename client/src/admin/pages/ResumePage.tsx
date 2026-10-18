import { useId, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Eye, ExternalLink, FileText, Loader2, Trash2, Upload } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatBytes, formatDateTime } from '@/lib/format';
import { safeHref } from '@/lib/url';
import { Button } from '@/components/ui/Button';
import { Lightbox } from '@/components/ui/Lightbox';
import { ErrorState, Skeleton } from '@/components/ui/States';
import { adminApi } from '../adminApi';
import { useConfirm, useToast } from '../components/Feedback';
import { preValidate } from '../components/FileUpload';
import { Card, PageHeader, Pill } from '../components/ui';
import { useRefresh } from '../hooks';

export function ResumePage() {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const confirm = useConfirm();
  const refresh = useRefresh();
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<number | null>(null);

  const q = useQuery({ queryKey: ['admin', 'resume'], queryFn: adminApi.resume });
  const settings = useQuery({ queryKey: ['admin', 'settings'], queryFn: adminApi.settings });
  const resume = q.data;
  const href = safeHref(resume?.url);

  async function onFile(file: File | undefined) {
    if (!file) return;
    const problem = preValidate(file, 'RESUME');
    if (problem) return toast.error(problem);
    setBusy(true);
    try {
      await adminApi.uploadResume(file);
      await refresh();
      toast.success('Resume uploaded. The website now offers it for download.');
    } catch (err) {
      toast.fromError(err, 'The resume could not be uploaded.');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  async function remove() {
    if (!(await confirm({ title: 'Remove the resume?', message: 'The download button will disappear from the website until you upload a new one.', confirmLabel: 'Remove resume', danger: true }))) return;
    try {
      await adminApi.deleteResume();
      await refresh();
      toast.success('Resume removed.');
    } catch (err) {
      toast.fromError(err);
    }
  }

  return (
    <>
      <PageHeader title="Resume" description="Upload your resume as a PDF. Visitors can download or preview it from the website. Uploading again replaces the old file." />

      {q.isPending && <Skeleton className="h-48" />}
      {q.isError && <ErrorState error={q.error} onRetry={() => void q.refetch()} />}

      {q.isSuccess && (
        <Card>
          <div className="flex flex-wrap items-center gap-5">
            <span aria-hidden="true" className={cn('grid size-16 shrink-0 place-items-center rounded-2xl', resume ? 'bg-accent-soft text-accent' : 'bg-surface-2 text-subtle')}>
              <FileText className="size-8" />
            </span>
            <div className="min-w-0 flex-1 basis-60">
              {resume ? (
                <>
                  <p className="truncate font-medium">{resume.originalName}</p>
                  <p className="text-sm text-muted">
                    PDF · {formatBytes(resume.sizeBytes)} · Updated {formatDateTime(resume.updatedAt)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Pill tone="good">On the website</Pill>
                    {settings.data && !settings.data.showResumeButton && <Pill tone="warn">Hidden by Settings → “Show resume button”</Pill>}
                  </div>
                </>
              ) : (
                <>
                  <p className="font-medium">No resume uploaded</p>
                  <p className="text-sm text-muted">The download button stays hidden until you upload one.</p>
                </>
              )}
              <p className="mt-2 text-xs text-subtle">PDF only · up to 10 MB</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <input ref={input} id={id} type="file" accept="application/pdf" className="sr-only" onChange={(e) => void onFile(e.target.files?.[0])} />
              <label htmlFor={id} className={cn('inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-accent px-6 font-medium text-accent-fg transition hover:brightness-110 focus-within:outline-2', busy && 'pointer-events-none opacity-60')}>
                {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Upload className="size-4" aria-hidden="true" />}
                {busy ? 'Uploading…' : resume ? 'Replace' : 'Upload resume'}
              </label>
              {resume && href && (
                <>
                  <Button variant="secondary" onClick={() => setPreview(0)}>
                    <Eye className="size-4" aria-hidden="true" /> Preview
                  </Button>
                  <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center gap-2 rounded-full border border-line-strong px-5 text-muted transition hover:border-accent hover:text-accent">
                    <ExternalLink className="size-4" aria-hidden="true" /> Open
                    <span className="sr-only"> (new tab)</span>
                  </a>
                </>
              )}
              {resume && (
                <Button variant="danger" onClick={() => void remove()}>
                  <Trash2 className="size-4" aria-hidden="true" /> Remove
                </Button>
              )}
            </div>
          </div>
          {resume && href && <Lightbox items={[{ kind: 'pdf', src: href, alt: 'Resume', caption: resume.originalName }]} index={preview} onClose={() => setPreview(null)} onIndexChange={setPreview} label="Resume preview" />}
        </Card>
      )}
    </>
  );
}
