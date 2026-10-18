import { api, apiPaged } from '@/lib/api';
import type {
  Certificate,
  ExperienceEntry,
  ProjectDetail,
  ProjectFilters,
  ProjectListItem,
  SiteData,
  SkillCategory,
} from '@/types/api';

export interface ProjectQuery {
  page?: number;
  pageSize?: number;
  q?: string;
  category?: string;
  tag?: string;
  featured?: boolean;
  sort?: 'order' | 'newest';
}

export const publicApi = {
  site: () => api<SiteData>('/site'),
  skills: () => api<SkillCategory[]>('/skills'),
  experience: () => api<ExperienceEntry[]>('/experience'),
  projects: (query: ProjectQuery) => apiPaged<ProjectListItem[]>('/projects', { query: query as Record<string, string | number | boolean | undefined> }),
  projectFilters: () => api<ProjectFilters>('/projects/filters'),
  project: (slug: string) => api<ProjectDetail>(`/projects/${encodeURIComponent(slug)}`),
  certificates: () => apiPaged<Certificate[], { categories: string[] }>('/certificates', { query: { pageSize: 100 } }),
  sendMessage: (body: {
    name: string;
    email: string;
    subject: string;
    message: string;
    website?: string;
    startedAt?: number;
    turnstileToken?: string;
  }) => api<{ received: boolean }>('/contact', { method: 'POST', body }),
};
