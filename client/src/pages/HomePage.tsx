import { lazy, Suspense } from 'react';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { useSite } from '@/hooks/usePublicData';
import { useSections } from '@/hooks/useSections';
import { About } from '@/components/home/About';
import { Certificates } from '@/components/home/Certificates';
import { Hero } from '@/components/home/Hero';
import { Journey } from '@/components/home/Journey';
import { ProjectsSection } from '@/components/home/ProjectsSection';
import { Skills } from '@/components/home/Skills';

// The contact form is the only public part that needs the form + validation libraries and it sits at the bottom of
// the page, so it is loaded as a separate chunk (fetched immediately after first render, before anyone scrolls there).
const Contact = lazy(() => import('@/components/home/Contact').then((mod) => ({ default: mod.Contact })));

/** Keeps the anchor (#contact) and the page height stable while the form's chunk loads. */
function ContactPlaceholder() {
  return <section id="contact" data-section aria-hidden="true" className="min-h-[44rem]" />;
}

export function HomePage() {
  const site = useSite();
  const { enabled } = useSections();
  useDocumentMeta({
    title: site.data?.settings.siteTitle,
    description: site.data?.settings.siteDescription,
    image: site.data?.profile.profileImage?.url,
  });

  return (
    <>
      <Hero />
      {enabled.has('about') && <About />}
      {enabled.has('skills') && <Skills />}
      {enabled.has('projects') && <ProjectsSection />}
      {enabled.has('certificates') && <Certificates />}
      {enabled.has('journey') && <Journey />}
      {enabled.has('contact') && (
        <Suspense fallback={<ContactPlaceholder />}>
          <Contact />
        </Suspense>
      )}
    </>
  );
}
