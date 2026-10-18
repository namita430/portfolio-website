import { useState } from 'react';
import { Download, Eye, FileText } from 'lucide-react';
import { useSite } from '@/hooks/usePublicData';
import { useSectionIndex } from '@/hooks/useSections';
import { formatBytes, formatFullDate, paragraphs } from '@/lib/format';
import { safeHref } from '@/lib/url';
import { Section } from '@/components/ui/Layout';
import { Reveal } from '@/components/ui/Reveal';
import { buttonClasses, Button } from '@/components/ui/Button';
import { Lightbox } from '@/components/ui/Lightbox';

export function About() {
  const site = useSite();
  const index = useSectionIndex('about');
  const [preview, setPreview] = useState<number | null>(null);
  if (!site.data) return null;
  const { profile, settings, resume } = site.data;
  const resumeHref = safeHref(resume?.url);
  const showResume = settings.showResumeButton && resume && resumeHref;

  return (
    <Section id="about" index={index} eyebrow="About" title={profile.aboutTitle}>
      <div className="grid gap-12 lg:grid-cols-[1.35fr_1fr] lg:gap-20">
        <Reveal>
          <div className="prose-lite max-w-2xl text-lg leading-[1.75] text-muted">
            {paragraphs(profile.aboutBody).map((p, i) => (
              <p key={i} className={i === 0 ? 'text-xl text-fg' : undefined}>
                {p}
              </p>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.1} className="space-y-5">
          {profile.aboutHighlights.length > 0 && (
            <dl className="divide-y divide-line rounded-2xl border border-line bg-surface">
              {profile.aboutHighlights.map((h) => (
                <div key={h.label} className="grid gap-1 px-6 py-5 sm:grid-cols-[8.5rem_1fr] sm:gap-4">
                  <dt className="eyebrow self-center text-subtle">{h.label}</dt>
                  <dd className="text-fg">{h.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {showResume && (
            <div className="border-gradient rounded-2xl bg-surface p-6">
              <div className="flex items-start gap-4">
                <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
                  <FileText className="size-5" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-display text-xl">Resume</h3>
                  <p className="mt-1 text-sm text-muted">
                    PDF · {formatBytes(resume.sizeBytes)} · Updated {formatFullDate(resume.updatedAt)}
                  </p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <a href={resumeHref} target="_blank" rel="noopener noreferrer" download className={buttonClasses('primary', 'sm')}>
                  <Download className="size-4" aria-hidden="true" /> Download
                  <span className="sr-only"> resume (PDF)</span>
                </a>
                <Button variant="secondary" size="sm" onClick={() => setPreview(0)}>
                  <Eye className="size-4" aria-hidden="true" /> Preview
                </Button>
              </div>
              <Lightbox
                items={[{ kind: 'pdf', src: resumeHref, alt: `Resume of ${profile.fullName}`, caption: `Resume — updated ${formatFullDate(resume.updatedAt)}` }]}
                index={preview}
                onClose={() => setPreview(null)}
                onIndexChange={setPreview}
                label="Resume preview"
              />
            </div>
          )}
        </Reveal>
      </div>
    </Section>
  );
}
