import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { ButtonLink } from '@/components/ui/Button';
import { Container } from '@/components/ui/Layout';

export function NotFoundPage({ what = 'page' }: { what?: string }) {
  useDocumentMeta({ title: 'Page not found', description: 'The page you are looking for does not exist.', noindex: true });
  return (
    <Container className="grid min-h-[60dvh] place-items-center py-24 text-center">
      <div>
        <p className="font-display text-[8rem] font-light italic leading-none text-accent/90 sm:text-[11rem]" aria-hidden="true">
          404
        </p>
        <h1 className="mt-2 font-display text-3xl tracking-tight sm:text-4xl">This {what} doesn&rsquo;t exist</h1>
        <p className="mx-auto mt-4 max-w-md text-muted">The link may be broken, or the {what} may have been moved or unpublished.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink to="/" size="lg">
            Back to home
          </ButtonLink>
          <ButtonLink to="/projects" variant="secondary" size="lg">
            Browse projects
          </ButtonLink>
        </div>
      </div>
    </Container>
  );
}
