/** Shapes returned by the Express API (see server/src/services/*). */

export interface Asset {
  id: number;
  url: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  originalName: string;
}

export type AssetPurpose = 'PROJECT_COVER' | 'PROJECT_IMAGE' | 'CERTIFICATE' | 'RESUME' | 'PROFILE' | 'JOURNEY_DOC';

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// ---- Projects
export type ProjectStatus = 'CONCEPT' | 'IN_PROGRESS' | 'LIVE_DEMO' | 'COMPLETED' | 'ARCHIVED';
export interface TagRef {
  name: string;
  slug: string;
}
export interface ProjectListItem {
  id: number;
  slug: string;
  title: string;
  tagline: string | null;
  shortDescription: string;
  category: string;
  status: ProjectStatus;
  githubUrl: string | null;
  liveUrl: string | null;
  isFeatured: boolean;
  publishedAt: string | null;
  coverImage: Asset | null;
  tags: TagRef[];
}
export interface ProjectChallenge {
  challenge: string;
  solution: string;
}
export interface ProjectDetail extends ProjectListItem {
  description: string;
  features: string[];
  challenges: ProjectChallenge[];
  lessonsLearned: string | null;
  images: Array<{ id: number; altText: string | null; asset: Asset }>;
  updatedAt: string;
}
export interface ProjectAdmin extends ProjectDetail {
  isPublished: boolean;
  sortOrder: number;
  createdAt: string;
}
export interface ProjectFilters {
  categories: Array<{ name: string; count: number }>;
  tags: Array<{ name: string; slug: string; count: number }>;
}

// ---- Certificates
export interface Certificate {
  id: number;
  title: string;
  issuer: string;
  issueDate: string | null;
  credentialId: string | null;
  verificationUrl: string | null;
  description: string | null;
  category: string;
  isFeatured: boolean;
  file: Asset | null;
  thumbnail: Asset | null;
}
export interface CertificateAdmin extends Certificate {
  isPublished: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// ---- Journey
export type ExperienceType =
  | 'TRAINING'
  | 'INTERNSHIP'
  | 'WORKSHOP'
  | 'WEBINAR'
  | 'DEVELOPMENT'
  | 'LEADERSHIP'
  | 'EMPLOYMENT'
  | 'EDUCATION'
  | 'OTHER';
export interface ExperienceEntry {
  id: number;
  type: ExperienceType;
  title: string;
  organization: string;
  role: string | null;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
  description: string | null;
  document: Asset | null;
  skills: string[];
}
export interface ExperienceAdmin extends ExperienceEntry {
  isPublished: boolean;
  sortOrder: number;
  updatedAt: string;
}

// ---- Skills
export interface SkillCategory {
  id: number;
  name: string;
  description: string | null;
  icon: string;
  skills: Array<{ id: number; name: string; note: string | null }>;
}
export interface SkillCategoryAdmin {
  id: number;
  name: string;
  description: string | null;
  icon: string;
  sortOrder: number;
  isVisible: boolean;
  skills: Array<{ id: number; categoryId: number; name: string; note: string | null; sortOrder: number; isVisible: boolean }>;
}

// ---- Profile & settings
export interface Profile {
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
  profileImage: Asset | null;
  updatedAt: string;
}
export type ThemeName = 'ember' | 'jade' | 'indigo' | 'rose' | 'paper';
export type SectionKey = 'about' | 'skills' | 'projects' | 'certificates' | 'journey' | 'contact';
export interface SiteSettings {
  siteTitle: string;
  siteDescription: string;
  heroHeadline: string;
  heroSubtext: string;
  theme: ThemeName;
  sectionVisibility: Record<SectionKey, boolean>;
  footerText: string;
  showResumeButton: boolean;
  updatedAt: string;
}
export interface Resume extends Asset {
  updatedAt: string;
}
export interface SiteData {
  profile: Profile;
  settings: SiteSettings;
  resume: Resume | null;
}

// ---- Contact inbox
export interface ContactMessage {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  isRead: boolean;
  emailStatus: 'NOT_CONFIGURED' | 'SENT' | 'FAILED';
  createdAt: string;
}

// ---- Admin overview & auth
export interface AdminUser {
  id: number;
  username: string;
  displayName: string | null;
}
export interface AuthSession {
  user: AdminUser;
  csrfToken: string;
  expiresAt: string;
}
export interface Overview {
  counts: {
    projects: { published: number; total: number };
    certificates: { published: number; total: number };
    journey: { published: number; total: number };
    messages: { unread: number; total: number };
  };
  hasResume: boolean;
  recentActivity: Array<{ kind: string; id?: number; title: string; isPublished?: boolean; at: string }>;
  recentMessages: Array<{ id: number; name: string; subject: string; isRead: boolean; createdAt: string }>;
}
