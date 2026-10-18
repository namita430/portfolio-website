import { api, apiForm, apiPaged } from '@/lib/api';
import type {
  Asset,
  AssetPurpose,
  AuthSession,
  CertificateAdmin,
  ContactMessage,
  ExperienceAdmin,
  ExperienceType,
  Overview,
  Profile,
  ProjectAdmin,
  ProjectChallenge,
  ProjectStatus,
  Resume,
  SectionKey,
  SiteSettings,
  SkillCategoryAdmin,
  ThemeName,
} from '@/types/api';

// ---- payloads (match server/src/validators/*)
export interface ProjectPayload {
  title: string;
  slug: string | null;
  tagline: string | null;
  shortDescription: string;
  description: string;
  category: string;
  status: ProjectStatus;
  githubUrl: string | null;
  liveUrl: string | null;
  features: string[];
  challenges: ProjectChallenge[];
  lessonsLearned: string | null;
  publishedAt: string | null;
  isFeatured: boolean;
  isPublished: boolean;
  coverImageId: number | null;
  screenshots: Array<{ assetId: number; altText: string | null }>;
  tags: string[];
}
export interface CertificatePayload {
  title: string;
  issuer: string;
  issueDate: string | null;
  credentialId: string | null;
  verificationUrl: string | null;
  description: string | null;
  category: string;
  fileId: number | null;
  thumbnailId: number | null;
  isFeatured: boolean;
  isPublished: boolean;
}
export interface ExperiencePayload {
  type: ExperienceType;
  title: string;
  organization: string;
  role: string | null;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
  description: string | null;
  documentId: number | null;
  tags: string[];
  isPublished: boolean;
}
export interface ProfilePayload {
  fullName: string;
  titles: string[];
  introduction: string;
  objective: string | null;
  aboutTitle: string;
  aboutBody: string;
  aboutHighlights: Array<{ label: string; value: string }>;
  location: string;
  email: string;
  githubUrl: string | null;
  linkedinUrl: string | null;
  profileImageId: number | null;
}
export interface SettingsPayload {
  siteTitle: string;
  siteDescription: string;
  heroHeadline: string;
  heroSubtext: string;
  theme: ThemeName;
  sectionVisibility: Record<SectionKey, boolean>;
  footerText: string;
  showResumeButton: boolean;
}
export interface SkillCategoryPayload {
  name: string;
  description: string | null;
  icon: string;
  isVisible: boolean;
}
export interface SkillPayload {
  categoryId: number;
  name: string;
  note: string | null;
  isVisible: boolean;
}

type ListStatus = 'all' | 'published' | 'draft';
const json = (method: 'POST' | 'PUT' | 'PATCH', body: unknown) => ({ method, body });
const del = { method: 'DELETE' as const };

export const adminApi = {
  // ---- auth
  me: () => api<AuthSession>('/auth/me'),
  login: (username: string, password: string) => api<AuthSession>('/auth/login', json('POST', { username, password })),
  logout: () => api<null>('/auth/logout', { method: 'POST' }),
  changePassword: (currentPassword: string, newPassword: string) => api<null>('/auth/change-password', json('POST', { currentPassword, newPassword })),

  // ---- dashboard
  overview: () => api<Overview>('/admin/overview'),
  tags: () => api<string[]>('/admin/tags'),

  // ---- files
  upload: (file: File, purpose: AssetPurpose) => {
    const form = new FormData();
    form.append('purpose', purpose); // text fields first so the server sees them before the file part
    form.append('file', file);
    return apiForm<Asset>('/admin/uploads', form);
  },
  cleanupUploads: () => api<{ found: number; removed: number }>('/admin/uploads/cleanup', { method: 'POST', body: {} }),

  // ---- projects
  projects: (query: { page?: number; pageSize?: number; q?: string; status?: ListStatus }) => apiPaged<ProjectAdmin[]>('/admin/projects', { query }),
  project: (id: number) => api<ProjectAdmin>(`/admin/projects/${id}`),
  createProject: (body: ProjectPayload) => api<ProjectAdmin>('/admin/projects', json('POST', body)),
  updateProject: (id: number, body: ProjectPayload) => api<ProjectAdmin>(`/admin/projects/${id}`, json('PUT', body)),
  publishProject: (id: number, isPublished: boolean) => api<ProjectAdmin>(`/admin/projects/${id}/publish`, json('PATCH', { isPublished })),
  featureProject: (id: number, isFeatured: boolean) => api<ProjectAdmin>(`/admin/projects/${id}/feature`, json('PATCH', { isFeatured })),
  reorderProjects: (ids: number[]) => api<null>('/admin/projects/reorder', json('POST', { ids })),
  deleteProject: (id: number) => api<null>(`/admin/projects/${id}`, del),

  // ---- certificates
  certificates: (query: { page?: number; pageSize?: number; q?: string; status?: ListStatus }) => apiPaged<CertificateAdmin[]>('/admin/certificates', { query }),
  certificate: (id: number) => api<CertificateAdmin>(`/admin/certificates/${id}`),
  createCertificate: (body: CertificatePayload) => api<CertificateAdmin>('/admin/certificates', json('POST', body)),
  updateCertificate: (id: number, body: CertificatePayload) => api<CertificateAdmin>(`/admin/certificates/${id}`, json('PUT', body)),
  publishCertificate: (id: number, isPublished: boolean) => api<CertificateAdmin>(`/admin/certificates/${id}/publish`, json('PATCH', { isPublished })),
  featureCertificate: (id: number, isFeatured: boolean) => api<CertificateAdmin>(`/admin/certificates/${id}/feature`, json('PATCH', { isFeatured })),
  reorderCertificates: (ids: number[]) => api<null>('/admin/certificates/reorder', json('POST', { ids })),
  deleteCertificate: (id: number) => api<null>(`/admin/certificates/${id}`, del),

  // ---- journey
  experience: () => api<ExperienceAdmin[]>('/admin/experience'),
  experienceEntry: (id: number) => api<ExperienceAdmin>(`/admin/experience/${id}`),
  createExperience: (body: ExperiencePayload) => api<ExperienceAdmin>('/admin/experience', json('POST', body)),
  updateExperience: (id: number, body: ExperiencePayload) => api<ExperienceAdmin>(`/admin/experience/${id}`, json('PUT', body)),
  publishExperience: (id: number, isPublished: boolean) => api<ExperienceAdmin>(`/admin/experience/${id}/publish`, json('PATCH', { isPublished })),
  reorderExperience: (ids: number[]) => api<null>('/admin/experience/reorder', json('POST', { ids })),
  deleteExperience: (id: number) => api<null>(`/admin/experience/${id}`, del),

  // ---- profile, settings, resume
  profile: () => api<Profile>('/admin/profile'),
  updateProfile: (body: ProfilePayload) => api<Profile>('/admin/profile', json('PUT', body)),
  settings: () => api<SiteSettings>('/admin/settings'),
  updateSettings: (body: SettingsPayload) => api<SiteSettings>('/admin/settings', json('PUT', body)),
  resume: () => api<Resume | null>('/admin/resume'),
  uploadResume: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiForm<Resume>('/admin/resume', form);
  },
  deleteResume: () => api<null>('/admin/resume', del),

  // ---- skills
  skills: () => api<SkillCategoryAdmin[]>('/admin/skills'),
  createCategory: (body: SkillCategoryPayload) => api<SkillCategoryAdmin>('/admin/skills/categories', json('POST', body)),
  updateCategory: (id: number, body: SkillCategoryPayload) => api<SkillCategoryAdmin>(`/admin/skills/categories/${id}`, json('PUT', body)),
  deleteCategory: (id: number) => api<null>(`/admin/skills/categories/${id}`, del),
  reorderCategories: (ids: number[]) => api<null>('/admin/skills/categories/reorder', json('POST', { ids })),
  createSkill: (body: SkillPayload) => api<unknown>('/admin/skills', json('POST', body)),
  updateSkill: (id: number, body: SkillPayload) => api<unknown>(`/admin/skills/${id}`, json('PUT', body)),
  deleteSkill: (id: number) => api<null>(`/admin/skills/${id}`, del),
  reorderSkills: (ids: number[]) => api<null>('/admin/skills/reorder', json('POST', { ids })),

  // ---- messages
  messages: (query: { page?: number; pageSize?: number; status?: 'all' | 'unread' | 'read'; q?: string }) => apiPaged<ContactMessage[], { unread: number }>('/admin/messages', { query }),
  setMessageRead: (id: number, isRead: boolean) => api<{ id: number; isRead: boolean }>(`/admin/messages/${id}`, json('PATCH', { isRead })),
  deleteMessage: (id: number) => api<null>(`/admin/messages/${id}`, del),
};
