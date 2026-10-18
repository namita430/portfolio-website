import { useParams } from 'react-router-dom';
import { ApiError } from '@/lib/api';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { useProject, useSite } from '@/hooks/usePublicData';
import { Container } from '@/components/ui/Layout';
import { ErrorState, Skeleton } from '@/components/ui/States';
import { ProjectView } from '@/components/projects/ProjectView';
import { NotFoundPage } from './NotFoundPage';

export function ProjectDetailPage() {
  const { slug } = useParams();
  const site = useSite();
  const project = useProject(slug);
  const owner = site.data?.profile.fullName ?? 'Portfolio';

  useDocumentMeta({
    title: project.data ? `${project.data.title} — ${owner}` : undefined,
    description: project.data?.shortDescription,
    image: project.data?.coverImage?.url,
  });

  if (project.isError && project.error instanceof ApiError && project.error.status === 404) {
    return <NotFoundPage what="project" />;
  }

  if (project.isPending) {
    return (
      <Container className="space-y-6 py-16">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-16 w-3/4" />
        <Skeleton className="h-96 w-full" />
      </Container>
    );
  }

  if (project.isError) {
    return (
      <Container className="py-24">
        <ErrorState title="This project could not be loaded" error={project.error} onRetry={() => void project.refetch()} />
      </Container>
    );
  }

  return <ProjectView project={project.data} />;
}
