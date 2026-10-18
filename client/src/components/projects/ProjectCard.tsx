import { Link } from 'react-router-dom';
import { ArrowUpRight, ExternalLink } from 'lucide-react';
import { safeHref } from '@/lib/url';
import type { ProjectListItem } from '@/types/api';
import { GitHubIcon } from '@/components/ui/icons';
import { StatusBadge, Tag } from '@/components/ui/Tag';
import { ProjectCover } from './ProjectCover';

const MAX_TAGS = 4;

/**
 * The whole card is one link to the project page (via the title's stretched ::after), while the repository and
 * demo links stay independently focusable above it.
 */
export function ProjectCard({ project, priority }: { project: ProjectListItem; priority?: boolean }) {
  const github = safeHref(project.githubUrl);
  const live = safeHref(project.liveUrl);
  const extra = project.tags.length - MAX_TAGS;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface transition-[border-color,transform,box-shadow] duration-500 ease-out-expo hover:-translate-y-1 hover:border-accent/50 hover:shadow-[0_30px_60px_-35px_var(--accent)] focus-within:border-accent/50">
      <ProjectCover title={project.title} category={project.category} image={project.coverImage} priority={priority} />

      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-subtle">{project.category}</span>
          <StatusBadge status={project.status} />
        </div>

        <h3 className="mt-3 font-display text-2xl leading-tight tracking-tight">
          <Link to={`/projects/${project.slug}`} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-offset-8">
            {project.title}
            <ArrowUpRight className="ml-1 inline size-5 -translate-y-0.5 text-subtle transition group-hover:translate-x-0.5 group-hover:-translate-y-1 group-hover:text-accent" aria-hidden="true" />
          </Link>
        </h3>
        {project.tagline && <p className="mt-1 text-sm text-muted">{project.tagline}</p>}
        <p className="mt-3 line-clamp-3 text-[0.95rem] leading-relaxed text-muted">{project.shortDescription}</p>

        {project.tags.length > 0 && (
          <ul className="mt-5 flex flex-wrap gap-1.5" aria-label="Technologies">
            {project.tags.slice(0, MAX_TAGS).map((t) => (
              <li key={t.slug}>
                <Tag>{t.name}</Tag>
              </li>
            ))}
            {extra > 0 && (
              <li>
                <Tag>+{extra}</Tag>
              </li>
            )}
          </ul>
        )}

        {(github || live) && (
          <div className="relative z-10 mt-auto flex flex-wrap items-center gap-2 pt-6">
            {github && (
              <a
                href={github}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-line-strong px-3.5 py-1.5 text-sm text-muted transition hover:border-accent hover:text-accent"
                aria-label={`${project.title} source code on GitHub (opens in a new tab)`}
              >
                <GitHubIcon className="size-4" /> Code
              </a>
            )}
            {live && (
              <a
                href={live}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-line-strong px-3.5 py-1.5 text-sm text-muted transition hover:border-accent hover:text-accent"
                aria-label={`${project.title} live demo (opens in a new tab)`}
              >
                <ExternalLink className="size-4" aria-hidden="true" /> Live demo
              </a>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
