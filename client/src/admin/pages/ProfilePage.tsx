import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { Loader2, Plus, X } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { ErrorState, Skeleton } from '@/components/ui/States';
import type { Asset, Profile } from '@/types/api';
import { adminApi, type ProfilePayload } from '../adminApi';
import { useToast } from '../components/Feedback';
import { FileUpload } from '../components/FileUpload';
import { Card, Field, IconButton, Input, PageHeader, SectionTitle, Textarea } from '../components/ui';
import { useRefresh, useUnsavedWarning } from '../hooks';

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
  fullName: z.string().trim().min(1, 'Your name is required.').max(120),
  titles: z.array(z.object({ value: z.string().trim().max(80) })).refine((t) => t.some((x) => x.value), 'Add at least one title.'),
  introduction: z.string().trim().min(1, 'The introduction is required.').max(1500),
  objective: z.string().trim().max(500),
  aboutTitle: z.string().trim().min(1, 'The About heading is required.').max(160),
  aboutBody: z.string().trim().min(1, 'The About text is required.').max(6000),
  aboutHighlights: z.array(z.object({ label: z.string().trim().max(40), value: z.string().trim().max(120) })).max(8),
  location: z.string().trim().min(1, 'Location is required.').max(120),
  email: z.email('Enter a valid email address.').max(190),
  githubUrl: optionalUrl,
  linkedinUrl: optionalUrl,
  profileImage: z.custom<Asset | null>(),
});
type FormValues = z.infer<typeof schema>;

const toForm = (p: Profile): FormValues => ({
  fullName: p.fullName,
  titles: p.titles.map((value) => ({ value })),
  introduction: p.introduction,
  objective: p.objective ?? '',
  aboutTitle: p.aboutTitle,
  aboutBody: p.aboutBody,
  aboutHighlights: p.aboutHighlights,
  location: p.location,
  email: p.email,
  githubUrl: p.githubUrl ?? '',
  linkedinUrl: p.linkedinUrl ?? '',
  profileImage: p.profileImage,
});

const toPayload = (v: FormValues): ProfilePayload => ({
  fullName: v.fullName,
  titles: v.titles.map((t) => t.value).filter(Boolean),
  introduction: v.introduction,
  objective: v.objective || null,
  aboutTitle: v.aboutTitle,
  aboutBody: v.aboutBody,
  aboutHighlights: v.aboutHighlights.filter((h) => h.label && h.value),
  location: v.location,
  email: v.email,
  githubUrl: v.githubUrl || null,
  linkedinUrl: v.linkedinUrl || null,
  profileImageId: v.profileImage?.id ?? null,
});

export function ProfilePage() {
  const q = useQuery({ queryKey: ['admin', 'profile'], queryFn: adminApi.profile });
  if (q.isPending) return <Skeleton className="h-96" />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  return <ProfileForm profile={q.data} />;
}

function ProfileForm({ profile }: { profile: Profile }) {
  const toast = useToast();
  const refresh = useRefresh();
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toForm(profile) });
  const { register, control, handleSubmit, setError, formState } = form;
  const { errors, isSubmitting, isDirty } = formState;
  useUnsavedWarning(isDirty && !isSubmitting);

  const titles = useFieldArray({ control, name: 'titles' });
  const highlights = useFieldArray({ control, name: 'aboutHighlights' });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const saved = await adminApi.updateProfile(toPayload(values));
      await refresh();
      form.reset(toForm(saved));
      toast.success('Profile saved. The website is updated.');
    } catch (err) {
      if (err instanceof ApiError && err.details) for (const d of err.details) if (d.path in toForm(profile)) setError(d.path as keyof FormValues, { message: d.message });
      toast.fromError(err, 'The profile could not be saved.');
    }
  });

  const err = (n: keyof FormValues) => (errors[n] as { message?: string } | undefined)?.message;
  const aria = (n: keyof FormValues) => ({ 'aria-invalid': !!errors[n], 'aria-describedby': errors[n] ? `${n}-err` : undefined });

  return (
    <form onSubmit={onSubmit} noValidate aria-label="Profile">
      <PageHeader
        title="Profile"
        description="Your name, titles, introduction, About section, contact details and social links."
        actions={
          <Button type="submit" size="md" disabled={isSubmitting || !isDirty}>
            {isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {isSubmitting ? 'Saving…' : 'Save changes'}
          </Button>
        }
      />

      <div className="space-y-6">
        <Card>
          <SectionTitle>Identity</SectionTitle>
          <div className="space-y-5">
            <Field label="Full name" htmlFor="fullName" error={err('fullName')} required>
              <Input id="fullName" {...register('fullName')} {...aria('fullName')} />
            </Field>

            <div>
              <p className="mb-1.5 text-sm font-medium">Titles</p>
              <p className="mb-2 text-xs text-subtle">These rotate in the hero section, e.g. “Frontend Developer”.</p>
              <ul className="space-y-2">
                {titles.fields.map((f, i) => (
                  <li key={f.id} className="flex gap-2">
                    <Input aria-label={`Title ${i + 1}`} {...register(`titles.${i}.value`)} />
                    <IconButton label={`Remove title ${i + 1}`} className="shrink-0 self-center hover:border-danger hover:text-danger" onClick={() => titles.remove(i)}>
                      <X className="size-4" aria-hidden="true" />
                    </IconButton>
                  </li>
                ))}
              </ul>
              {errors.titles?.message && (
                <p role="alert" className="mt-1.5 text-sm text-danger">
                  {errors.titles.message}
                </p>
              )}
              <Button variant="secondary" size="sm" className="mt-3" onClick={() => titles.append({ value: '' })}>
                <Plus className="size-4" aria-hidden="true" /> Add title
              </Button>
            </div>

            <Field label="Introduction" htmlFor="introduction" error={err('introduction')} required hint="A sentence or two about you. Shown under the headline in the hero.">
              <Textarea id="introduction" rows={3} {...register('introduction')} {...aria('introduction')} />
            </Field>
            <Field label="Objective" htmlFor="objective" error={err('objective')} hint="Optional one-liner, shown in the footer.">
              <Input id="objective" {...register('objective')} />
            </Field>
            <Controller control={control} name="profileImage" render={({ field }) => <FileUpload label="Profile photo (optional)" purpose="PROFILE" value={field.value} onChange={field.onChange} description="The site looks good without one. Shown in the hero when set." />} />
          </div>
        </Card>

        <Card>
          <SectionTitle>About section</SectionTitle>
          <div className="space-y-5">
            <Field label="Heading" htmlFor="aboutTitle" error={err('aboutTitle')} required>
              <Input id="aboutTitle" {...register('aboutTitle')} {...aria('aboutTitle')} />
            </Field>
            <Field label="Text" htmlFor="aboutBody" error={err('aboutBody')} required hint="Separate paragraphs with a blank line. The first paragraph is shown larger.">
              <Textarea id="aboutBody" rows={10} {...register('aboutBody')} {...aria('aboutBody')} />
            </Field>
            <div>
              <p className="mb-1.5 text-sm font-medium">Highlights</p>
              <p className="mb-2 text-xs text-subtle">Short facts shown beside the About text, e.g. “Based in — Nepal”.</p>
              <ul className="space-y-2">
                {highlights.fields.map((f, i) => (
                  <li key={f.id} className="grid grid-cols-[1fr_2fr_auto] gap-2">
                    <Input aria-label={`Highlight ${i + 1} label`} placeholder="Label" {...register(`aboutHighlights.${i}.label`)} />
                    <Input aria-label={`Highlight ${i + 1} value`} placeholder="Value" {...register(`aboutHighlights.${i}.value`)} />
                    <IconButton label={`Remove highlight ${i + 1}`} className="self-center hover:border-danger hover:text-danger" onClick={() => highlights.remove(i)}>
                      <X className="size-4" aria-hidden="true" />
                    </IconButton>
                  </li>
                ))}
              </ul>
              {highlights.fields.length < 8 && (
                <Button variant="secondary" size="sm" className="mt-3" onClick={() => highlights.append({ label: '', value: '' })}>
                  <Plus className="size-4" aria-hidden="true" /> Add highlight
                </Button>
              )}
            </div>
          </div>
        </Card>

        <Card>
          <SectionTitle>Contact &amp; links</SectionTitle>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Email" htmlFor="email" error={err('email')} required hint="Shown publicly on the website.">
              <Input id="email" type="email" {...register('email')} {...aria('email')} />
            </Field>
            <Field label="Location" htmlFor="location" error={err('location')} required>
              <Input id="location" {...register('location')} {...aria('location')} />
            </Field>
            <Field label="GitHub URL" htmlFor="githubUrl" error={err('githubUrl')}>
              <Input id="githubUrl" type="url" placeholder="https://github.com/…" {...register('githubUrl')} {...aria('githubUrl')} />
            </Field>
            <Field label="LinkedIn URL" htmlFor="linkedinUrl" error={err('linkedinUrl')}>
              <Input id="linkedinUrl" type="url" placeholder="https://linkedin.com/in/…" {...register('linkedinUrl')} {...aria('linkedinUrl')} />
            </Field>
          </div>
        </Card>
      </div>

      <div className="mt-8 flex justify-end border-t border-line pt-6">
        <Button type="submit" size="lg" disabled={isSubmitting || !isDirty}>
          {isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {isSubmitting ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}
