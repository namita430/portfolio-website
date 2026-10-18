import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { publicApi, type ProjectQuery } from '@/services/publicApi';

export const useSite = () => useQuery({ queryKey: ['site'], queryFn: publicApi.site });

export const useSkills = () => useQuery({ queryKey: ['skills'], queryFn: publicApi.skills });

export const useExperience = () => useQuery({ queryKey: ['experience'], queryFn: publicApi.experience });

export const useCertificates = () => useQuery({ queryKey: ['certificates'], queryFn: publicApi.certificates });

export const useProjects = (query: ProjectQuery) =>
  useQuery({ queryKey: ['projects', query], queryFn: () => publicApi.projects(query), placeholderData: keepPreviousData });

export const useProjectFilters = () => useQuery({ queryKey: ['project-filters'], queryFn: publicApi.projectFilters });

export const useProject = (slug: string | undefined) =>
  useQuery({ queryKey: ['project', slug], queryFn: () => publicApi.project(slug!), enabled: !!slug });
