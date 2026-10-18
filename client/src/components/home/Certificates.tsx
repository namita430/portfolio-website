import { useMemo, useState } from 'react';
import { Award, ExternalLink, FileText, Maximize2 } from 'lucide-react';
import { useCertificates } from '@/hooks/usePublicData';
import { useSectionIndex } from '@/hooks/useSections';
import { cn } from '@/lib/cn';
import { formatMonthYear, isImage } from '@/lib/format';
import { safeHref } from '@/lib/url';
import type { Certificate } from '@/types/api';
import { Section } from '@/components/ui/Layout';
import { Lightbox, type LightboxItem } from '@/components/ui/Lightbox';
import { Reveal } from '@/components/ui/Reveal';
import { ErrorState, Skeleton } from '@/components/ui/States';
import { Tag } from '@/components/ui/Tag';

/** The image shown on the card: the certificate itself if it is an image, else the uploaded preview image. */
const previewImage = (c: Certificate) => (c.file && isImage(c.file.mimeType) ? c.file : c.thumbnail);

export function Certificates() {
  const query = useCertificates();
  const index = useSectionIndex('certificates');
  const [category, setCategory] = useState<string>('All');
  const [open, setOpen] = useState<number | null>(null);

  const all = query.data?.data ?? [];
  const categories = useMemo(() => ['All', ...(query.data?.meta.categories ?? [])], [query.data]);
  const visible = useMemo(() => (category === 'All' ? all : all.filter((c) => c.category === category)), [all, category]);

  // Everything with a file can be previewed in the lightbox, in the order shown.
  const lightboxItems = useMemo(() => {
    const items: LightboxItem[] = [];
    const indexById = new Map<number, number>();
    for (const c of visible) {
      if (!c.file) continue;
      const href = safeHref(c.file.url);
      if (!href) continue;
      indexById.set(c.id, items.length);
      items.push(
        isImage(c.file.mimeType)
          ? { kind: 'image', src: href, alt: `${c.title} — ${c.issuer}`, caption: `${c.title} · ${c.issuer}`, width: c.file.width, height: c.file.height }
          : { kind: 'pdf', src: href, alt: `${c.title} — ${c.issuer} (PDF)`, caption: `${c.title} · ${c.issuer}` },
      );
    }
    return { items, indexById };
  }, [visible]);

  return (
    <Section
      id="certificates"
      index={index}
      eyebrow="Certificates"
      title="Learning, on the record"
      description="Courses, programmes and badges I have completed. Each one is published only with its certificate or a verification link."
    >
      {query.isPending && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-80" />
          ))}
        </div>
      )}
      {query.isError && <ErrorState error={query.error} onRetry={() => void query.refetch()} />}

      {query.data && (
        <>
          {categories.length > 2 && (
            <Reveal>
              <div role="group" aria-label="Filter certificates by category" className="mb-10 flex flex-wrap gap-2">
                {categories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={category === c}
                    onClick={() => setCategory(c)}
                    className={cn(
                      'rounded-full border px-4 py-1.5 text-sm transition',
                      category === c ? 'border-accent bg-accent text-accent-fg' : 'border-line-strong text-muted hover:border-accent hover:text-accent',
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </Reveal>
          )}

          <p className="sr-only" role="status">
            Showing {visible.length} of {all.length} certificates
          </p>

          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((c, i) => {
              const img = previewImage(c);
              const fileHref = safeHref(c.file?.url);
              const verify = safeHref(c.verificationUrl);
              const lightboxIndex = lightboxItems.indexById.get(c.id);
              return (
                <li key={c.id}>
                  <Reveal delay={(i % 3) * 0.07} className="h-full">
                    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface transition-[border-color,transform] duration-500 ease-out-expo hover:-translate-y-1 hover:border-accent/50">
                      {lightboxIndex !== undefined ? (
                        <button
                          type="button"
                          onClick={() => setOpen(lightboxIndex)}
                          className="relative block aspect-[4/3] w-full overflow-hidden bg-surface-2 text-left"
                          aria-label={`Preview certificate: ${c.title}`}
                        >
                          {img ? (
                            <img
                              src={img.url}
                              alt=""
                              width={img.width ?? undefined}
                              height={img.height ?? undefined}
                              loading="lazy"
                              decoding="async"
                              className="size-full object-cover object-top transition-transform duration-700 ease-out-expo group-hover:scale-[1.03]"
                            />
                          ) : (
                            <span className="grid size-full place-items-center text-accent">
                              <FileText className="size-12" aria-hidden="true" />
                            </span>
                          )}
                          <span className="absolute right-3 top-3 grid size-9 place-items-center rounded-full border border-line-strong bg-bg/80 text-fg opacity-0 backdrop-blur transition group-hover:opacity-100 group-focus-within:opacity-100">
                            <Maximize2 className="size-4" aria-hidden="true" />
                          </span>
                        </button>
                      ) : (
                        <div aria-hidden="true" className="grid aspect-[4/3] w-full place-items-center bg-surface-2 text-accent/80">
                          <Award className="size-12" />
                        </div>
                      )}

                      <div className="flex flex-1 flex-col p-6">
                        <Tag className="self-start">{c.category}</Tag>
                        <h3 className="mt-3 font-display text-xl leading-snug">{c.title}</h3>
                        <p className="mt-1 text-sm text-muted">
                          {c.issuer}
                          {c.issueDate && <span className="text-subtle"> · {formatMonthYear(c.issueDate)}</span>}
                        </p>
                        {c.description && <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted">{c.description}</p>}
                        {c.credentialId && <p className="mt-3 font-mono text-xs text-subtle">ID: {c.credentialId}</p>}

                        {(fileHref || verify) && (
                          <div className="mt-auto flex flex-wrap gap-x-5 gap-y-2 pt-5 text-sm">
                            {verify && (
                              <a href={verify} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-accent hover:underline">
                                Verify credential <ExternalLink className="size-3.5" aria-hidden="true" />
                                <span className="sr-only"> (opens in a new tab)</span>
                              </a>
                            )}
                            {fileHref && c.file && !isImage(c.file.mimeType) && (
                              <a href={fileHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-muted hover:text-fg hover:underline">
                                Open PDF <ExternalLink className="size-3.5" aria-hidden="true" />
                                <span className="sr-only"> (opens in a new tab)</span>
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </article>
                  </Reveal>
                </li>
              );
            })}
          </ul>

          <Lightbox items={lightboxItems.items} index={open} onClose={() => setOpen(null)} onIndexChange={setOpen} label="Certificate preview" />
        </>
      )}
    </Section>
  );
}
