import { ExternalLink, Paperclip } from 'lucide-react';
import { useExperience } from '@/hooks/usePublicData';
import { useSectionIndex } from '@/hooks/useSections';
import { EXPERIENCE_LABEL, formatDateRange } from '@/lib/format';
import { safeHref } from '@/lib/url';
import { Section } from '@/components/ui/Layout';
import { Reveal } from '@/components/ui/Reveal';
import { ErrorState, Skeleton } from '@/components/ui/States';
import { Tag } from '@/components/ui/Tag';

export function Journey() {
  const entries = useExperience();
  const index = useSectionIndex('journey');

  return (
    <Section
      id="journey"
      index={index}
      eyebrow="Journey"
      title="How I've been learning and growing"
      description="Training programmes, workshops and activities that shaped how I build software."
    >
      {entries.isPending && <Skeleton className="h-72" />}
      {entries.isError && <ErrorState error={entries.error} onRetry={() => void entries.refetch()} />}
      {entries.data && (
        <ol className="relative ml-2 max-w-3xl space-y-12 border-l border-line-strong pl-8 sm:ml-3 sm:pl-10">
          {entries.data.map((e, i) => {
            const range = formatDateRange(e.startDate, e.endDate, e.isCurrent);
            const doc = safeHref(e.document?.url);
            return (
              <li key={e.id} className="relative">
                <Reveal delay={Math.min(i, 3) * 0.05}>
                  <span aria-hidden="true" className="absolute -left-[2.55rem] top-1.5 grid size-4 place-items-center rounded-full border-2 border-accent bg-bg sm:-left-[3.05rem]">
                    {e.isCurrent && <span className="size-1.5 rounded-full bg-accent" />}
                  </span>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs uppercase tracking-[0.12em] text-subtle">
                    <span className="text-accent">{EXPERIENCE_LABEL[e.type]}</span>
                    {range && <span>{range}</span>}
                    {e.location && <span>· {e.location}</span>}
                  </div>

                  <h3 className="mt-2 font-display text-2xl leading-snug tracking-tight">{e.title}</h3>
                  <p className="mt-1 text-muted">
                    {e.organization}
                    {e.role && <span className="text-subtle"> · {e.role}</span>}
                  </p>
                  {e.description && <p className="mt-3 max-w-2xl leading-relaxed text-muted">{e.description}</p>}

                  {e.skills.length > 0 && (
                    <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Skills learned">
                      {e.skills.map((s) => (
                        <li key={s}>
                          <Tag>{s}</Tag>
                        </li>
                      ))}
                    </ul>
                  )}

                  {doc && (
                    <a href={doc} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm text-accent hover:underline">
                      <Paperclip className="size-4" aria-hidden="true" /> Supporting document <ExternalLink className="size-3.5" aria-hidden="true" />
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  )}
                </Reveal>
              </li>
            );
          })}
        </ol>
      )}
    </Section>
  );
}
