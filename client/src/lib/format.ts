import type { ExperienceType, ProjectStatus } from '@/types/api';

/** Dates from the API are plain YYYY-MM-DD or ISO strings; format in UTC so they never shift a day. */
const monthYear = new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const fullDate = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

const parse = (value: string | null | undefined) => {
  if (!value) return null;
  const d = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const formatMonthYear = (value: string | null | undefined) => {
  const d = parse(value);
  return d ? monthYear.format(d) : '';
};

export const formatFullDate = (value: string | null | undefined) => {
  const d = parse(value);
  return d ? fullDate.format(d) : '';
};

export function formatDateTime(value: string) {
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? ''
    : new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(d);
}

/** "Mar 2026 — Present", "Mar 2026", or "" when the owner has not provided dates. */
export function formatDateRange(start: string | null, end: string | null, isCurrent: boolean) {
  const s = formatMonthYear(start);
  const e = isCurrent ? 'Present' : formatMonthYear(end);
  if (s && e && s !== e) return `${s} — ${e}`;
  return s || e;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  CONCEPT: 'Concept',
  IN_PROGRESS: 'In progress',
  LIVE_DEMO: 'Live demo',
  COMPLETED: 'Completed',
  ARCHIVED: 'Archived',
};

export const EXPERIENCE_LABEL: Record<ExperienceType, string> = {
  TRAINING: 'Training',
  INTERNSHIP: 'Internship',
  WORKSHOP: 'Workshop',
  WEBINAR: 'Webinar',
  DEVELOPMENT: 'Development',
  LEADERSHIP: 'Leadership',
  EMPLOYMENT: 'Employment',
  EDUCATION: 'Education',
  OTHER: 'Other',
};

export const isImage = (mime: string) => mime.startsWith('image/');

/** Splits a plain string into paragraphs on blank lines. */
export const paragraphs = (text: string) =>
  text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

export const initials = (title: string) =>
  title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
