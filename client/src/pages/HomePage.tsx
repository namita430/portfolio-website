import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { useSite } from '@/hooks/usePublicData';
import { useSections } from '@/hooks/useSections';
import { About } from '@/components/home/About';
import { Certificates } from '@/components/home/Certificates';
import { Contact } from '@/components/home/Contact';
import { Hero } from '@/components/home/Hero';
import { Journey } from '@/components/home/Journey';
import { ProjectsSection } from '@/components/home/ProjectsSection';
import { Skills } from '@/components/home/Skills';

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
      {enabled.has('contact') && <Contact />}
    </>
  );
}
