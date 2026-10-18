import { Link, useNavigate, useParams } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { EXPERIENCE_LABEL } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { ErrorState, Skeleton } from '@/components/ui/States';
import type { Asset, ExperienceAdmin, ExperienceType } from '@/types/api';
import { adminApi, type ExperiencePayload } from '../adminApi';
import { useConfirm, useToast } from '../components/Feedback';
import { FileUpload } from '../components/FileUpload';
import { TagInput } from '../components/TagInput';
import { Card, Field, Input, PageHeader, SectionTitle, Select, Switch, Textarea } from '../components/ui';
import { useRefresh, useUnsavedWarning } from '../hooks';

const TYPES = Object.keys(EXPERIENCE_LABEL) as ExperienceType[];

const schema = z
  .object({
    type: z.enum(['TRAINING', 'INTERNSHIP', 'WORKSHOP', 'WEBINAR', 'DEVELOPMENT', 'LEADERSHIP', 'EMPLOYMENT', 'EDUCATION', 'OTHER']),
    title: z.string().trim().min(1, 'Title is required.').max(200),
    organization: z.string().trim().min(1, 'Organisation is required.').max(160),
    role: z.string().trim().max(160),
    location: z.string().trim().max(120),
    startDate: z.string(),
    endDate: z.string(),
    isCurrent: z.boolean(),
    description: z.string().trim().max(5000),
    document: z.custom<Asset | null>(),
    tags: z.array(z.string()).max(25),
    isPublished: z.boolean(),
  })
  .refine((v) => v.isCurrent || !v.startDate || !v.endDate || v.endDate >= v.startDate, { path: ['endDate'], message: 'The end date cannot be before the start date.' });
type FormValues = z.infer<typeof schema>;

const empty: FormValues = { type: 'TRAINING', title: '', organization: '', role: '', location: '', startDate: '', endDate: '', isCurrent: false, description: '', document: null, tags: [], isPublished: false };

const toForm = (e: ExperienceAdmin): FormValues => ({
  type: e.type,
  title: e.title,
  organization: e.organization,
  role: e.role ?? '',
  location: e.location ?? '',
  startDate: e.startDate ?? '',
  endDate: e.endDate ?? '',
  isCurrent: e.isCurrent,
  description: e.description ?? '',
  document: e.document,
  tags: e.skills,
  isPublished: e.isPublished,
});

const toPayload = (v: FormValues): ExperiencePayload => ({
  type: v.type,
  title: v.title,
  organization: v.organization,
  role: v.role || null,
  location: v.location || null,
  startDate: v.startDate || null,
  endDate: v.isCurrent ? null : v.endDate || null,
  isCurrent: v.isCurrent,
  description: v.description || null,
  documentId: v.document?.id ?? null,
  tags: v.tags,
  isPublished: v.isPublished,
});

export function JourneyFormPage() {
  const { id } = useParams();
  const entryId = id ? Number(id) : null;
  const query = useQuery({ queryKey: ['admin', 'experience', entryId], queryFn: () => adminApi.experienceEntry(entryId!), enabled: entryId !== null });
  if (entryId !== null && query.isPending) return <Skeleton className="h-96" />;
  if (entryId !== null && query.isError) return <ErrorState title="Could not load this entry" error={query.error} onRetry={() => void query.refetch()} />;
  return <JourneyForm key={entryId ?? 'new'} entry={query.data ?? null} />;
}

function JourneyForm({ entry }: { entry: ExperienceAdmin | null }) {
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const refresh = useRefresh();

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: entry ? toForm(entry) : empty });
  const { register, control, handleSubmit, setError, watch, formState } = form;
  const { errors, isSubmitting, isDirty } = formState;
  useUnsavedWarning(isDirty && !isSubmitting);
  const current = watch('isCurrent');

  const onSubmit = handleSubmit(async (values) => {
    try {
      const payload = toPayload(values);
      const saved = entry ? await adminApi.updateExperience(entry.id, payload) : await adminApi.createExperience(payload);
      await refresh();
      toast.success(entry ? 'Entry saved.' : 'Entry created.');
      if (!entry) navigate(`/admin/journey/${saved.id}`, { replace: true });
      else form.reset(toForm(saved));
    } catch (err) {
      if (err instanceof ApiError && err.details) for (const d of err.details) if (d.path in empty) setError(d.path as keyof FormValues, { message: d.message });
      toast.fromError(err, 'The entry could not be saved.');
    }
  });

  async function remove() {
    if (!entry) return;
    if (!(await confirm({ title: 'Delete this entry?', message: 'It will be removed from your journey timeline.', confirmLabel: 'Delete entry', danger: true }))) return;
    try {
      await adminApi.deleteExperience(entry.id);
      await refresh();
      toast.success('Entry deleted.');
      navigate('/admin/journey', { replace: true });
    } catch (err) {
      toast.fromError(err);
    }
  }

  const err = (n: keyof FormValues) => (errors[n] as { message?: string } | undefined)?.message;
  const aria = (n: keyof FormValues) => ({ 'aria-invalid': !!errors[n], 'aria-describedby': errors[n] ? `${n}-err` : undefined });

  return (
    <form onSubmit={onSubmit} noValidate aria-label={entry ? 'Edit journey entry' : 'New journey entry'}>
      <Link to="/admin/journey" className="mb-4 inline-flex items-center gap-2 text-sm text-muted hover:text-accent">
        <ArrowLeft className="size-4" aria-hidden="true" /> All entries
      </Link>
      <PageHeader
        title={entry ? 'Edit entry' : 'New journey entry'}
        description="Leave dates empty if you are not sure of them — never guess."
        actions={
          <Button type="submit" size="md" disabled={isSubmitting || (!!entry && !isDirty)}>
            {isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {isSubmitting ? 'Saving…' : entry ? 'Save changes' : 'Create entry'}
          </Button>
        }
      />

      <div className="space-y-6">
        <Card>
          <SectionTitle>What and where</SectionTitle>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Type" htmlFor="type" error={err('type')}>
              <Select id="type" {...register('type')}>
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {EXPERIENCE_LABEL[t]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Organisation" htmlFor="organization" error={err('organization')} required>
              <Input id="organization" {...register('organization')} {...aria('organization')} />
            </Field>
            <Field label="Title" htmlFor="title" error={err('title')} required className="sm:col-span-2">
              <Input id="title" placeholder="e.g. Python with Django Training" {...register('title')} {...aria('title')} />
            </Field>
            <Field label="Your role" htmlFor="role" error={err('role')} hint="Optional, e.g. Participant, Intern, Developer.">
              <Input id="role" {...register('role')} />
            </Field>
            <Field label="Location" htmlFor="location" error={err('location')} hint="Optional.">
              <Input id="location" {...register('location')} />
            </Field>
          </div>
        </Card>

        <Card>
          <SectionTitle>When</SectionTitle>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Start date" htmlFor="startDate" error={err('startDate')}>
              <Input id="startDate" type="date" {...register('startDate')} />
            </Field>
            <Field label="End date" htmlFor="endDate" error={err('endDate')}>
              <Input id="endDate" type="date" disabled={current} {...register('endDate')} {...aria('endDate')} />
            </Field>
            <div className="sm:col-span-2">
              <Controller control={control} name="isCurrent" render={({ field }) => <Switch id="isCurrent" label="This is ongoing" description="Shows “Present” instead of an end date." checked={field.value} onChange={field.onChange} />} />
            </div>
          </div>
        </Card>

        <Card>
          <SectionTitle>Details</SectionTitle>
          <div className="space-y-5">
            <Field label="Description" htmlFor="description" error={err('description')} hint="What you did or learned. Keep it factual.">
              <Textarea id="description" rows={5} {...register('description')} />
            </Field>
            <Field label="Skills learned" htmlFor="tags" hint="Press Enter or comma after each one.">
              <Controller control={control} name="tags" render={({ field }) => <TagInput id="tags" value={field.value} onChange={field.onChange} />} />
            </Field>
            <Controller control={control} name="document" render={({ field }) => <FileUpload label="Supporting document (optional)" purpose="JOURNEY_DOC" value={field.value} onChange={field.onChange} description="A certificate, letter or photo that backs this entry up." />} />
          </div>
        </Card>

        <Card>
          <SectionTitle>Publishing</SectionTitle>
          <Controller control={control} name="isPublished" render={({ field }) => <Switch id="isPublished" label="Published" description="Visible on the website's journey timeline." checked={field.value} onChange={field.onChange} />} />
        </Card>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
        {entry ? (
          <Button variant="danger" size="md" onClick={() => void remove()}>
            <Trash2 className="size-4" aria-hidden="true" /> Delete entry
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" size="lg" disabled={isSubmitting || (!!entry && !isDirty)}>
          {isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {isSubmitting ? 'Saving…' : entry ? 'Save changes' : 'Create entry'}
        </Button>
      </div>
    </form>
  );
}
