import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useProjects } from '@/hooks/usePublicData';
import { useSectionIndex } from '@/hooks/useSections';
import { buttonClasses } from '@/components/ui/Button';
import { Section } from '@/components/ui/Layout';
import { Reveal } from '@/components/ui/Reveal';
import { ErrorState, Skeleton } from '@/components/ui/States';
import { ProjectCard } from '@/components/projects/ProjectCard';

const LIMIT = 6;

export function ProjectsSection() {
  // Same query key as useSections(), so this costs no additional request.
  const projects = useProjects({ pageSize: LIMIT, sort: 'order' });
  const total = projects.data?.meta.total ?? 0;
  const index = useSectionIndex('projects');

  return (
    <Section
      id="projects"
      index={index}
      eyebrow="Projects"
      title="Things I've built"
      description="Real projects with working code and, where available, live demos. Each one links to its repository."
    >
      {projects.isPending && (
        <div className="grid gap-6 md:grid-cols-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-96" />
          ))}
        </div>
      )}
      {projects.isError && <ErrorState error={projects.error} onRetry={() => void projects.refetch()} />}
      {projects.data && (
        <>
          <ul className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {projects.data.data.map((p, i) => (
              <li key={p.id}>
                <Reveal delay={(i % 3) * 0.08} className="h-full">
                  <ProjectCard project={p} />
                </Reveal>
              </li>
            ))}
          </ul>
          {total > LIMIT && (
            <Reveal className="mt-12 text-center">
              <Link to="/projects" className={buttonClasses('secondary', 'lg')}>
                View all {total} projects <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Reveal>
          )}
          {total <= LIMIT && total > 0 && (
            <Reveal className="mt-10 text-center">
              <Link to="/projects" className="link-underline inline-flex items-center gap-2 text-muted transition hover:text-accent">
                Browse and filter all projects <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Reveal>
          )}
        </>
      )}
    </Section>
  );
}
