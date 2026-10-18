import { useMemo } from 'react';
import { useCertificates, useExperience, useProjects, useSite } from './usePublicData';
import type { SectionKey } from '@/types/api';

export interface NavSection {
  id: SectionKey;
  label: string;
}

const ALL: NavSection[] = [
  { id: 'about', label: 'About' },
  { id: 'skills', label: 'Skills' },
  { id: 'projects', label: 'Projects' },
  { id: 'certificates', label: 'Certificates' },
  { id: 'journey', label: 'Journey' },
  { id: 'contact', label: 'Contact' },
];

/** "01", "02", ... — the section's position among the sections actually shown. */
export function useSectionIndex(id: SectionKey) {
  const { nav } = useSections();
  const position = nav.findIndex((s) => s.id === id);
  return position < 0 ? undefined : String(position + 1).padStart(2, '0');
}

/**
 * Sections to render and link to. A section is shown only when the owner has it switched on AND (for
 * projects, certificates and journey) there is published content, so the site never shows empty shells.
 * These hooks share query keys with the sections themselves, so they cost no extra requests.
 */
export function useSections() {
  const site = useSite();
  const projects = useProjects({ pageSize: 6, sort: 'order' });
  const certificates = useCertificates();
  const experience = useExperience();

  return useMemo(() => {
    const visibility = site.data?.settings.sectionVisibility;
    const hasContent: Record<SectionKey, boolean | undefined> = {
      about: true,
      skills: true,
      contact: true,
      projects: projects.isPending ? true : (projects.data?.meta.total ?? 0) > 0,
      certificates: certificates.isPending ? true : (certificates.data?.data.length ?? 0) > 0,
      journey: experience.isPending ? true : (experience.data?.length ?? 0) > 0,
    };
    const enabled = new Set(ALL.filter((s) => (visibility?.[s.id] ?? true) && hasContent[s.id]).map((s) => s.id));
    return { enabled, nav: ALL.filter((s) => enabled.has(s.id)) };
  }, [site.data, projects.isPending, projects.data, certificates.isPending, certificates.data, experience.isPending, experience.data]);
}
