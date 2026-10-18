import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { ArrowLeft, Eye, Loader2, Plus, Trash2, X } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { STATUS_LABEL } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { ProjectView } from '@/components/projects/ProjectView';
import { ErrorState, Skeleton } from '@/components/ui/States';
import type { Asset, ProjectAdmin, ProjectDetail, ProjectStatus } from '@/types/api';
import { adminApi, type ProjectPayload } from '../adminApi';
import { useConfirm, useToast } from '../components/Feedback';
import { FileUpload } from '../components/FileUpload';
import { ScreenshotsField } from '../components/ScreenshotsField';
import { TagInput } from '../components/TagInput';
import { Card, Field, IconButton, Input, PageHeader, SectionTitle, Select, Switch, Textarea } from '../components/ui';
import { useRefresh, useUnsavedWarning } from '../hooks';

const STATUSES = Object.keys(STATUS_LABEL) as ProjectStatus[];

const optionalUrl = z
  .string()
  .trim()
  .refine((v) => {
    if (v === '') return true;
    try {
      const u = new URL(v);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  }, 'Enter a full link starting with http:// or https://');

const schema = z.object({
  title: z.string().trim().min(1, 'Title is required.').max(160, 'Keep the title under 160 characters.'),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(120)
    .refine((v) => v === '' || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v), 'Use lowercase letters, numbers and single hyphens.'),
  tagline: z.string().trim().max(200, 'Keep the tagline under 200 characters.'),
  shortDescription: z.string().trim().min(1, 'A short description is required.').max(320, 'Keep it under 320 characters — it is shown on cards.'),
  description: z.string().trim().min(1, 'A detailed description is required.').max(10000),
  category: z.string().trim().min(1, 'Category is required.').max(80),
  status: z.enum(['CONCEPT', 'IN_PROGRESS', 'LIVE_DEMO', 'COMPLETED', 'ARCHIVED']),
  githubUrl: optionalUrl,
  liveUrl: optionalUrl,
  features: z.array(z.object({ value: z.string().max(300, 'Keep each feature under 300 characters.') })).max(30),
  challenges: z.array(z.object({ challenge: z.string().max(600), solution: z.string().max(1500) })).max(20),
  lessonsLearned: z.string().max(5000),
  publishedAt: z.string(),
  isFeatured: z.boolean(),
  isPublished: z.boolean(),
  cover: z.custom<Asset | null>(),
  screenshots: z.array(z.object({ asset: z.custom<Asset>(), altText: z.string().max(200) })).max(24),
  tags: z.array(z.string()).max(25),
});
type FormValues = z.infer<typeof schema>;

const emptyValues: FormValues = {
  title: '',
  slug: '',
  tagline: '',
  shortDescription: '',
  description: '',
  category: 'Web Application',
  status: 'IN_PROGRESS',
  githubUrl: '',
  liveUrl: '',
  features: [],
  challenges: [],
  lessonsLearned: '',
  publishedAt: '',
  isFeatured: false,
  isPublished: false,
  cover: null,
  screenshots: [],
  tags: [],
};

const toForm = (p: ProjectAdmin): FormValues => ({
  title: p.title,
  slug: p.slug,
  tagline: p.tagline ?? '',
  shortDescription: p.shortDescription,
  description: p.description,
  category: p.category,
  status: p.status,
  githubUrl: p.githubUrl ?? '',
  liveUrl: p.liveUrl ?? '',
  features: p.features.map((value) => ({ value })),
  challenges: p.challenges,
  lessonsLearned: p.lessonsLearned ?? '',
  publishedAt: p.publishedAt ? p.publishedAt.slice(0, 10) : '',
  isFeatured: p.isFeatured,
  isPublished: p.isPublished,
  cover: p.coverImage,
  screenshots: p.images.map((i) => ({ asset: i.asset, altText: i.altText ?? '' })),
  tags: p.tags.map((t) => t.name),
});

const toPayload = (v: FormValues): ProjectPayload => ({
  title: v.title,
  slug: v.slug || null,
  tagline: v.tagline || null,
  shortDescription: v.shortDescription,
  description: v.description,
  category: v.category,
  status: v.status,
  githubUrl: v.githubUrl || null,
  liveUrl: v.liveUrl || null,
  features: v.features.map((f) => f.value.trim()).filter(Boolean),
  challenges: v.challenges.map((c) => ({ challenge: c.challenge.trim(), solution: c.solution.trim() })).filter((c) => c.challenge && c.solution),
  lessonsLearned: v.lessonsLearned.trim() || null,
  publishedAt: v.publishedAt || null,
  isFeatured: v.isFeatured,
  isPublished: v.isPublished,
  coverImageId: v.cover?.id ?? null,
  screenshots: v.screenshots.map((s) => ({ assetId: s.asset.id, altText: s.altText.trim() || null })),
  tags: v.tags,
});

/** Builds what the public project page would show, from the unsaved form. */
const toPreview = (v: FormValues): ProjectDetail => ({
  id: 0,
  slug: v.slug || 'preview',
  title: v.title || 'Untitled project',
  tagline: v.tagline || null,
  shortDescription: v.shortDescription,
  category: v.category || 'Uncategorised',
  status: v.status,
  githubUrl: v.githubUrl || null,
  liveUrl: v.liveUrl || null,
  isFeatured: v.isFeatured,
  publishedAt: v.publishedAt || null,
  coverImage: v.cover,
  tags: v.tags.map((t) => ({ name: t, slug: t })),
  description: v.description || 'No description yet.',
  features: v.features.map((f) => f.value).filter(Boolean),
  challenges: v.challenges.filter((c) => c.challenge && c.solution),
  lessonsLearned: v.lessonsLearned || null,
  images: v.screenshots.map((s, i) => ({ id: i, altText: s.altText || null, asset: s.asset })),
  updatedAt: new Date().toISOString(),
});

export function ProjectFormPage() {
  const { id } = useParams();
  const projectId = id ? Number(id) : null;
  const query = useQuery({ queryKey: ['admin', 'project', projectId], queryFn: () => adminApi.project(projectId!), enabled: projectId !== null });

  if (projectId !== null && query.isPending) return <Skeleton className="h-96" />;
  if (projectId !== null && query.isError) return <ErrorState title="Could not load this project" error={query.error} onRetry={() => void query.refetch()} />;

  return <ProjectForm key={projectId ?? 'new'} project={query.data ?? null} />;
}

function ProjectForm({ project }: { project: ProjectAdmin | null }) {
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const refresh = useRefresh();
  const [previewOpen, setPreviewOpen] = useState(false);

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: project ? toForm(project) : emptyValues });
  const { register, control, handleSubmit, setError, watch, formState } = form;
  const { errors, isSubmitting, isDirty } = formState;
  useUnsavedWarning(isDirty && !isSubmitting);

  const features = useFieldArray({ control, name: 'features' });
  const challenges = useFieldArray({ control, name: 'challenges' });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const payload = toPayload(values);
      const saved = project ? await adminApi.updateProject(project.id, payload) : await adminApi.createProject(payload);
      await refresh();
      toast.success(project ? 'Project saved.' : 'Project created.');
      if (!project) navigate(`/admin/projects/${saved.id}`, { replace: true });
      else form.reset(toForm(saved));
    } catch (err) {
      if (err instanceof ApiError && err.details) {
        for (const d of err.details) if (d.path in emptyValues) setError(d.path as keyof FormValues, { message: d.message });
      }
      if (err instanceof ApiError && err.status === 409) setError('slug', { message: err.message });
      toast.fromError(err, 'The project could not be saved.');
    }
  });

  async function remove() {
    if (!project) return;
    const ok = await confirm({ title: 'Delete this project?', message: 'It will be removed from the website together with its uploaded images. This cannot be undone.', confirmLabel: 'Delete project', danger: true });
    if (!ok) return;
    try {
      await adminApi.deleteProject(project.id);
      await refresh();
      toast.success('Project deleted.');
      navigate('/admin/projects', { replace: true });
    } catch (err) {
      toast.fromError(err);
    }
  }

  const err = (name: keyof FormValues) => (errors[name] as { message?: string } | undefined)?.message;
  const aria = (name: keyof FormValues) => ({ 'aria-invalid': !!errors[name], 'aria-describedby': errors[name] ? `${name}-err` : undefined });

  return (
    <form onSubmit={onSubmit} noValidate aria-label={project ? 'Edit project' : 'New project'}>
      <Link to="/admin/projects" className="mb-4 inline-flex items-center gap-2 text-sm text-muted hover:text-accent">
        <ArrowLeft className="size-4" aria-hidden="true" /> All projects
      </Link>
      <PageHeader
        title={project ? 'Edit project' : 'New project'}
        description={project ? `/${project.slug}` : 'Fill in the basics; you can come back to add more detail any time.'}
        actions={
          <>
            <Button variant="secondary" size="md" onClick={() => setPreviewOpen(true)}>
              <Eye className="size-4" aria-hidden="true" /> Preview
            </Button>
            <Button type="submit" size="md" disabled={isSubmitting || (!!project && !isDirty)}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {isSubmitting ? 'Saving…' : project ? 'Save changes' : 'Create project'}
            </Button>
          </>
        }
      />

      <div className="space-y-6">
        <Card>
          <SectionTitle>Basics</SectionTitle>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Title" htmlFor="title" error={err('title')} required className="sm:col-span-2">
              <Input id="title" {...register('title')} {...aria('title')} />
            </Field>
            <Field label="Slug (web address)" htmlFor="slug" error={err('slug')} hint="Leave empty to generate it from the title. Changing it later breaks old links.">
              <Input id="slug" placeholder="my-project" {...register('slug')} {...aria('slug')} />
            </Field>
            <Field label="Tagline" htmlFor="tagline" error={err('tagline')} hint="Optional one-line subtitle.">
              <Input id="tagline" {...register('tagline')} {...aria('tagline')} />
            </Field>
            <Field label="Category" htmlFor="category" error={err('category')} required>
              <Input id="category" list="category-suggestions" {...register('category')} {...aria('category')} />
              <datalist id="category-suggestions">
                <option value="Web Application" />
                <option value="Platform" />
                <option value="Mobile App" />
                <option value="Tooling" />
                <option value="Design" />
              </datalist>
            </Field>
            <Field label="Project status" htmlFor="status" error={err('status')} hint="Be honest about where the project stands.">
              <Select id="status" {...register('status')}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </Card>

        <Card>
          <SectionTitle>Description</SectionTitle>
          <div className="space-y-5">
            <Field label="Short description" htmlFor="shortDescription" error={err('shortDescription')} required hint="Shown on project cards (max 320 characters).">
              <Textarea id="shortDescription" rows={3} {...register('shortDescription')} {...aria('shortDescription')} />
            </Field>
            <Field label="Detailed description" htmlFor="description" error={err('description')} required hint="Separate paragraphs with a blank line.">
              <Textarea id="description" rows={8} {...register('description')} {...aria('description')} />
            </Field>
            <Field label="Lessons learned" htmlFor="lessonsLearned" error={err('lessonsLearned')} hint="Optional. What did you take away from building it?">
              <Textarea id="lessonsLearned" rows={4} {...register('lessonsLearned')} {...aria('lessonsLearned')} />
            </Field>
          </div>
        </Card>

        <Card>
          <SectionTitle description="Only add links that work. Leave empty if there is no demo or repository.">Links</SectionTitle>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="GitHub repository URL" htmlFor="githubUrl" error={err('githubUrl')}>
              <Input id="githubUrl" type="url" inputMode="url" placeholder="https://github.com/…" {...register('githubUrl')} {...aria('githubUrl')} />
            </Field>
            <Field label="Live demo URL" htmlFor="liveUrl" error={err('liveUrl')}>
              <Input id="liveUrl" type="url" inputMode="url" placeholder="https://…" {...register('liveUrl')} {...aria('liveUrl')} />
            </Field>
          </div>
        </Card>

        <Card>
          <SectionTitle>Images</SectionTitle>
          <div className="space-y-6">
            <Controller control={control} name="cover" render={({ field }) => <FileUpload label="Cover image" purpose="PROJECT_COVER" value={field.value} onChange={field.onChange} description="Shown on the project card and at the top of its page. Without one, a neutral placeholder is used." />} />
            <ScreenshotsField control={control as never} register={register as never} />
          </div>
        </Card>

        <Card>
          <SectionTitle>Technologies</SectionTitle>
          <Field label="Technology tags" htmlFor="tags" hint="Press Enter or comma after each one, e.g. React, Node.js, MySQL.">
            <Controller control={control} name="tags" render={({ field }) => <TagInput id="tags" value={field.value} onChange={field.onChange} />} />
          </Field>
        </Card>

        <Card>
          <SectionTitle description="Short bullet points about what the project does.">Key features</SectionTitle>
          <ul className="space-y-2.5">
            {features.fields.map((f, i) => (
              <li key={f.id} className="flex gap-2">
                <Input aria-label={`Feature ${i + 1}`} {...register(`features.${i}.value`)} />
                <IconButton label={`Remove feature ${i + 1}`} className="shrink-0 self-center hover:border-danger hover:text-danger" onClick={() => features.remove(i)}>
                  <X className="size-4" aria-hidden="true" />
                </IconButton>
              </li>
            ))}
          </ul>
          <Button variant="secondary" size="sm" className="mt-3" onClick={() => features.append({ value: '' })}>
            <Plus className="size-4" aria-hidden="true" /> Add feature
          </Button>
        </Card>

        <Card>
          <SectionTitle description="Real obstacles you faced and how you solved them. Rows missing either side are ignored.">Challenges &amp; solutions</SectionTitle>
          <ul className="space-y-4">
            {challenges.fields.map((c, i) => (
              <li key={c.id} className="rounded-xl border border-line p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Challenge" htmlFor={`ch-${i}`}>
                    <Textarea id={`ch-${i}`} rows={3} {...register(`challenges.${i}.challenge`)} />
                  </Field>
                  <Field label="Solution" htmlFor={`so-${i}`}>
                    <Textarea id={`so-${i}`} rows={3} {...register(`challenges.${i}.solution`)} />
                  </Field>
                </div>
                <button type="button" onClick={() => challenges.remove(i)} className="mt-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-danger">
                  <Trash2 className="size-4" aria-hidden="true" /> Remove this pair
                </button>
              </li>
            ))}
          </ul>
          <Button variant="secondary" size="sm" className="mt-3" onClick={() => challenges.append({ challenge: '', solution: '' })}>
            <Plus className="size-4" aria-hidden="true" /> Add challenge
          </Button>
        </Card>

        <Card>
          <SectionTitle>Publishing</SectionTitle>
          <div className="space-y-5">
            <Controller control={control} name="isPublished" render={({ field }) => <Switch id="isPublished" label="Published" description="Visible on the website. Turn off to keep it as a private draft." checked={field.value} onChange={field.onChange} />} />
            <Controller control={control} name="isFeatured" render={({ field }) => <Switch id="isFeatured" label="Featured" description="Marks the project as a highlight." checked={field.value} onChange={field.onChange} />} />
            <Field label="Publication date" htmlFor="publishedAt" hint="Optional. Set automatically when you first publish if left empty." className="max-w-xs">
              <Input id="publishedAt" type="date" {...register('publishedAt')} />
            </Field>
          </div>
        </Card>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
        {project ? (
          <Button variant="danger" size="md" onClick={() => void remove()}>
            <Trash2 className="size-4" aria-hidden="true" /> Delete project
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" size="lg" disabled={isSubmitting || (!!project && !isDirty)}>
          {isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {isSubmitting ? 'Saving…' : project ? 'Save changes' : 'Create project'}
        </Button>
      </div>

      <PreviewDialog open={previewOpen} onClose={() => setPreviewOpen(false)} getProject={() => toPreview(watch())} />
    </form>
  );
}

/** Full-screen preview of the public page using the unsaved form values. */
function PreviewDialog({ open, onClose, getProject }: { open: boolean; onClose: () => void; getProject: () => ProjectDetail }) {
  return (
    <dialog
      ref={(el) => {
        if (!el) return;
        if (open && !el.open) el.showModal();
        if (!open && el.open) el.close();
      }}
      aria-label="Project preview"
      onClose={onClose}
      className="m-0 h-dvh max-h-none w-screen max-w-none overflow-y-auto bg-bg p-0 text-fg backdrop:bg-black/80"
    >
      {open && (
        <>
          <div className="sticky top-0 z-50 flex items-center justify-between gap-3 border-b border-accent/40 bg-bg/95 px-4 py-3 backdrop-blur">
            <p className="text-sm text-muted">
              <span className="font-medium text-accent">Preview</span> — this is how the page will look. Nothing is saved or published by previewing.
            </p>
            <Button variant="secondary" size="sm" onClick={onClose}>
              <X className="size-4" aria-hidden="true" /> Close preview
            </Button>
          </div>
          <ProjectView project={getProject()} preview />
        </>
      )}
    </dialog>
  );
}
