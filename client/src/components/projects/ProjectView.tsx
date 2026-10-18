import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Lightbulb, Wrench } from 'lucide-react';
import { formatFullDate, paragraphs } from '@/lib/format';
import { displayHost, safeHref } from '@/lib/url';
import type { ProjectDetail } from '@/types/api';
import { buttonClasses } from '@/components/ui/Button';
import { GitHubIcon } from '@/components/ui/icons';
import { Container } from '@/components/ui/Layout';
import { Lightbox, type LightboxItem } from '@/components/ui/Lightbox';
import { Reveal } from '@/components/ui/Reveal';
import { StatusBadge, Tag } from '@/components/ui/Tag';
import { ProjectCover } from './ProjectCover';

interface ProjectViewProps {
  project: ProjectDetail;
  /** When previewing from the admin dashboard, the back link is replaced by a banner. */
  preview?: boolean;
}

/** Full project page. Shared by the public route and the admin "Preview" so they can never drift apart. */
export function ProjectView({ project, preview }: ProjectViewProps) {
  const github = safeHref(project.githubUrl);
  const live = safeHref(project.liveUrl);
  const [lightbox, setLightbox] = useState<number | null>(null);

  const gallery: LightboxItem[] = project.images.map((img) => ({
    kind: 'image',
    src: img.asset.url,
    alt: img.altText || `${project.title} screenshot`,
    caption: img.altText || undefined,
    width: img.asset.width,
    height: img.asset.height,
  }));

  return (
    <article>
      <header className="relative isolate overflow-hidden border-b border-line">
        <div aria-hidden="true" className="accent-glow absolute inset-x-0 top-0 -z-10 h-80" />
        <Container className="pb-14 pt-10 sm:pb-20 sm:pt-14">
          {!preview && (
            <Link to="/projects" className="inline-flex items-center gap-2 text-sm text-muted transition hover:text-accent">
              <ArrowLeft className="size-4" aria-hidden="true" /> All projects
            </Link>
          )}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <StatusBadge status={project.status} />
            <span className="font-mono text-xs uppercase tracking-[0.14em] text-subtle">{project.category}</span>
            {project.publishedAt && <span className="font-mono text-xs text-subtle">· {formatFullDate(project.publishedAt)}</span>}
          </div>
          <h1 className="mt-5 max-w-4xl font-display text-5xl leading-[1.05] tracking-tight text-balance sm:text-6xl">{project.title}</h1>
          {project.tagline && <p className="mt-4 max-w-2xl text-xl text-muted">{project.tagline}</p>}

          <div className="mt-8 flex flex-wrap gap-3">
            {live && (
              <a href={live} target="_blank" rel="noopener noreferrer" className={buttonClasses('primary', 'md')}>
                <ExternalLink className="size-4" aria-hidden="true" /> Live demo
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            )}
            {github && (
              <a href={github} target="_blank" rel="noopener noreferrer" className={buttonClasses('secondary', 'md')}>
                <GitHubIcon className="size-4" /> View code
                <span className="sr-only"> on GitHub (opens in a new tab)</span>
              </a>
            )}
          </div>
        </Container>
      </header>

      <Container className="grid gap-14 py-14 sm:py-20 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-16">
          <Reveal>
            <div className="border-gradient overflow-hidden rounded-3xl">
              <ProjectCover title={project.title} category={project.category} image={project.coverImage} priority className="aspect-[16/9]" />
            </div>
          </Reveal>

          <Reveal>
            <section aria-labelledby="overview-title">
              <h2 id="overview-title" className="font-display text-3xl tracking-tight">
                Overview
              </h2>
              <div className="prose-lite mt-5 max-w-3xl space-y-0 text-lg leading-relaxed text-muted">
                {paragraphs(project.description).map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </section>
          </Reveal>

          {project.features.length > 0 && (
            <Reveal>
              <section aria-labelledby="features-title">
                <h2 id="features-title" className="font-display text-3xl tracking-tight">
                  Key features
                </h2>
                <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                  {project.features.map((f, i) => (
                    <li key={i} className="flex gap-3 rounded-xl border border-line bg-surface p-4 text-[0.95rem]">
                      <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </Reveal>
          )}

          {gallery.length > 0 && (
            <Reveal>
              <section aria-labelledby="gallery-title">
                <h2 id="gallery-title" className="font-display text-3xl tracking-tight">
                  Screenshots
                </h2>
                <ul className="mt-6 grid gap-4 sm:grid-cols-2">
                  {gallery.map((item, i) => (
                    <li key={item.src}>
                      <button
                        type="button"
                        onClick={() => setLightbox(i)}
                        className="group block w-full overflow-hidden rounded-xl border border-line bg-surface-2 transition hover:border-accent/60"
                        aria-label={`Open screenshot ${i + 1} of ${gallery.length}${item.caption ? `: ${item.caption}` : ''}`}
                      >
                        <img
                          src={item.src}
                          alt={item.alt}
                          width={item.width ?? undefined}
                          height={item.height ?? undefined}
                          loading="lazy"
                          decoding="async"
                          className="aspect-[16/10] w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                        />
                      </button>
                    </li>
                  ))}
                </ul>
                <Lightbox items={gallery} index={lightbox} onClose={() => setLightbox(null)} onIndexChange={setLightbox} label={`${project.title} screenshots`} />
              </section>
            </Reveal>
          )}

          {project.challenges.length > 0 && (
            <Reveal>
              <section aria-labelledby="challenges-title">
                <h2 id="challenges-title" className="font-display text-3xl tracking-tight">
                  Challenges &amp; solutions
                </h2>
                <ul className="mt-6 space-y-4">
                  {project.challenges.map((c, i) => (
                    <li key={i} className="grid gap-5 rounded-2xl border border-line bg-surface p-6 md:grid-cols-2">
                      <div>
                        <p className="mb-2 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.14em] text-subtle">
                          <Wrench className="size-3.5" aria-hidden="true" /> Challenge
                        </p>
                        <p className="text-muted">{c.challenge}</p>
                      </div>
                      <div>
                        <p className="mb-2 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.14em] text-accent">
                          <Lightbulb className="size-3.5" aria-hidden="true" /> Solution
                        </p>
                        <p>{c.solution}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            </Reveal>
          )}

          {project.lessonsLearned && (
            <Reveal>
              <section aria-labelledby="lessons-title">
                <h2 id="lessons-title" className="font-display text-3xl tracking-tight">
                  Lessons learned
                </h2>
                <div className="prose-lite mt-5 max-w-3xl text-lg leading-relaxed text-muted">
                  {paragraphs(project.lessonsLearned).map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              </section>
            </Reveal>
          )}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start" aria-label="Project details">
          <div className="space-y-7 rounded-2xl border border-line bg-surface p-6">
            <dl className="space-y-5 text-sm">
              <div>
                <dt className="eyebrow text-subtle">Status</dt>
                <dd className="mt-2">
                  <StatusBadge status={project.status} />
                </dd>
              </div>
              <div>
                <dt className="eyebrow text-subtle">Category</dt>
                <dd className="mt-1.5">{project.category}</dd>
              </div>
              {project.tags.length > 0 && (
                <div>
                  <dt className="eyebrow text-subtle">Technologies</dt>
                  <dd className="mt-2.5 flex flex-wrap gap-1.5">
                    {project.tags.map((t) => (
                      <Tag key={t.slug}>{t.name}</Tag>
                    ))}
                  </dd>
                </div>
              )}
              {(live || github) && (
                <div>
                  <dt className="eyebrow text-subtle">Links</dt>
                  <dd className="mt-2 space-y-2">
                    {live && (
                      <a href={live} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-muted transition hover:text-accent">
                        <ExternalLink className="size-4 shrink-0" aria-hidden="true" /> <span className="truncate">{displayHost(live)}</span>
                        <span className="sr-only">(live demo, opens in a new tab)</span>
                      </a>
                    )}
                    {github && (
                      <a href={github} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-muted transition hover:text-accent">
                        <GitHubIcon className="size-4 shrink-0" /> <span className="truncate">Repository</span>
                        <span className="sr-only">(opens in a new tab)</span>
                      </a>
                    )}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </aside>
      </Container>
    </article>
  );
}
