import { useEffect, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { Check, Loader2, Star } from 'lucide-react';
import { cn } from '@/lib/cn';
import { applyTheme, THEMES } from '@/lib/theme';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { ErrorState, Skeleton } from '@/components/ui/States';
import type { SectionKey, SiteSettings } from '@/types/api';
import { adminApi } from '../adminApi';
import { useToast } from '../components/Feedback';
import { Card, Field, IconButton, Input, PageHeader, SectionTitle, Switch, Textarea } from '../components/ui';
import { useRefresh, useUnsavedWarning } from '../hooks';

const SECTIONS: Array<{ key: SectionKey; label: string; hint: string }> = [
  { key: 'about', label: 'About', hint: 'Your story, highlights and resume card.' },
  { key: 'skills', label: 'Skills', hint: 'Skill groups and tags.' },
  { key: 'projects', label: 'Projects', hint: 'Hidden automatically when no project is published.' },
  { key: 'certificates', label: 'Certificates', hint: 'Hidden automatically when no certificate is published.' },
  { key: 'journey', label: 'Journey', hint: 'Hidden automatically when no entry is published.' },
  { key: 'contact', label: 'Contact', hint: 'The contact form and your links.' },
];

const schema = z.object({
  siteTitle: z.string().trim().min(1, 'Required.').max(160),
  siteDescription: z.string().trim().min(1, 'Required.').max(320, 'Keep it under 320 characters.'),
  heroHeadline: z.string().trim().min(1, 'The headline is required.').max(200),
  heroSubtext: z.string().trim().min(1, 'The supporting text is required.').max(500),
  theme: z.enum(['ember', 'jade', 'indigo', 'rose', 'paper']),
  sectionVisibility: z.object({ about: z.boolean(), skills: z.boolean(), projects: z.boolean(), certificates: z.boolean(), journey: z.boolean(), contact: z.boolean() }),
  footerText: z.string().trim().min(1, 'Required.').max(300),
  showResumeButton: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

const toForm = (s: SiteSettings): FormValues => ({
  siteTitle: s.siteTitle,
  siteDescription: s.siteDescription,
  heroHeadline: s.heroHeadline,
  heroSubtext: s.heroSubtext,
  theme: s.theme,
  sectionVisibility: s.sectionVisibility,
  footerText: s.footerText,
  showResumeButton: s.showResumeButton,
});

export function SettingsPage() {
  const q = useQuery({ queryKey: ['admin', 'settings'], queryFn: adminApi.settings });
  if (q.isPending) return <Skeleton className="h-96" />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  return (
    <>
      <SettingsForm settings={q.data} />
      <FeaturedProjects />
    </>
  );
}

function SettingsForm({ settings }: { settings: SiteSettings }) {
  const toast = useToast();
  const refresh = useRefresh();
  const savedTheme = useRef(settings.theme);
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toForm(settings) });
  const { register, control, handleSubmit, setError, watch, formState } = form;
  const { errors, isSubmitting, isDirty } = formState;
  useUnsavedWarning(isDirty && !isSubmitting);

  // Selecting a theme previews it immediately; leaving without saving restores the saved one.
  const theme = watch('theme');
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);
  useEffect(() => {
    const saved = savedTheme;
    return () => applyTheme(saved.current);
  }, []);

  const onSubmit = handleSubmit(async (values) => {
    try {
      const saved = await adminApi.updateSettings(values);
      savedTheme.current = saved.theme;
      await refresh();
      form.reset(toForm(saved));
      toast.success('Settings saved. The website is updated.');
    } catch (err) {
      if (err instanceof ApiError && err.details) for (const d of err.details) if (d.path in toForm(settings)) setError(d.path as keyof FormValues, { message: d.message });
      toast.fromError(err, 'The settings could not be saved.');
    }
  });

  const err = (n: keyof FormValues) => (errors[n] as { message?: string } | undefined)?.message;
  const aria = (n: keyof FormValues) => ({ 'aria-invalid': !!errors[n], 'aria-describedby': errors[n] ? `${n}-err` : undefined });

  return (
    <form onSubmit={onSubmit} noValidate aria-label="Website settings">
      <PageHeader
        title="Settings"
        description="Hero text, colour theme, which sections appear, and the footer."
        actions={
          <Button type="submit" size="md" disabled={isSubmitting || !isDirty}>
            {isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {isSubmitting ? 'Saving…' : 'Save changes'}
          </Button>
        }
      />

      <div className="space-y-6">
        <Card>
          <SectionTitle>Hero</SectionTitle>
          <div className="space-y-5">
            <Field label="Headline" htmlFor="heroHeadline" error={err('heroHeadline')} required hint="The last two words are highlighted in the accent colour.">
              <Input id="heroHeadline" {...register('heroHeadline')} {...aria('heroHeadline')} />
            </Field>
            <Field label="Supporting text" htmlFor="heroSubtext" error={err('heroSubtext')} required>
              <Textarea id="heroSubtext" rows={3} {...register('heroSubtext')} {...aria('heroSubtext')} />
            </Field>
            <Controller control={control} name="showResumeButton" render={({ field }) => <Switch id="showResumeButton" label="Show resume button" description="Adds the download button to the hero and About section (only appears when a resume is uploaded)." checked={field.value} onChange={field.onChange} />} />
          </div>
        </Card>

        <Card>
          <SectionTitle description="Every theme is checked for readable contrast.">Colour theme</SectionTitle>
          <Controller
            control={control}
            name="theme"
            render={({ field }) => (
              <div role="radiogroup" aria-label="Colour theme" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {THEMES.map((t) => {
                  const selected = field.value === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => field.onChange(t.id)}
                      className={cn('flex items-center gap-3 rounded-xl border p-3 text-left transition', selected ? 'border-accent bg-accent-soft' : 'border-line-strong hover:border-accent/60')}
                    >
                      <span aria-hidden="true" className="relative grid size-12 shrink-0 place-items-center rounded-lg border border-line-strong" style={{ background: t.bg }}>
                        <span className="size-5 rounded-full" style={{ background: t.swatch }} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{t.label}</span>
                        <span className="block text-xs text-muted">{t.description}</span>
                      </span>
                      {selected && <Check className="size-5 shrink-0 text-accent" aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
            )}
          />
        </Card>

        <Card>
          <SectionTitle description="Turn whole sections on or off. Projects, certificates and journey also hide themselves when empty.">Sections</SectionTitle>
          <ul className="divide-y divide-line">
            {SECTIONS.map((s) => (
              <li key={s.key} className="py-3.5 first:pt-0 last:pb-0">
                <Controller control={control} name={`sectionVisibility.${s.key}`} render={({ field }) => <Switch id={`vis-${s.key}`} label={s.label} description={s.hint} checked={field.value} onChange={field.onChange} />} />
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <SectionTitle>Footer &amp; search engines</SectionTitle>
          <div className="space-y-5">
            <Field label="Footer text" htmlFor="footerText" error={err('footerText')} required hint="Shown after “© year Your name.”">
              <Input id="footerText" {...register('footerText')} {...aria('footerText')} />
            </Field>
            <Field label="Page title" htmlFor="siteTitle" error={err('siteTitle')} required hint="Shown in the browser tab and search results.">
              <Input id="siteTitle" {...register('siteTitle')} {...aria('siteTitle')} />
            </Field>
            <Field label="Page description" htmlFor="siteDescription" error={err('siteDescription')} required hint="Shown in search results and link previews.">
              <Textarea id="siteDescription" rows={2} {...register('siteDescription')} {...aria('siteDescription')} />
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

/** Choose which published projects are highlighted. */
function FeaturedProjects() {
  const toast = useToast();
  const refresh = useRefresh();
  const list = useQuery({ queryKey: ['admin', 'projects', '', 'all'], queryFn: () => adminApi.projects({ pageSize: 100, status: 'all' }) });
  const toggle = useMutation({
    mutationFn: ({ id, value }: { id: number; value: boolean }) => adminApi.featureProject(id, value),
    onSuccess: () => void refresh(),
    onError: (err) => toast.fromError(err),
  });
  const projects = list.data?.data ?? [];

  return (
    <Card className="mt-6">
      <SectionTitle description="Featured projects are marked as highlights. Reorder projects on the Projects page.">Featured projects</SectionTitle>
      {list.isPending && <Skeleton className="h-20" />}
      {list.isError && <ErrorState error={list.error} onRetry={() => void list.refetch()} />}
      {list.data && projects.length === 0 && <p className="text-sm text-muted">No projects yet.</p>}
      <ul className="divide-y divide-line">
        {projects.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="truncate">{p.title}</p>
              <p className="text-xs text-subtle">{p.isPublished ? 'Published' : 'Draft — not visible yet'}</p>
            </div>
            <IconButton label={p.isFeatured ? `Unfeature ${p.title}` : `Feature ${p.title}`} aria-pressed={p.isFeatured} className={cn(p.isFeatured && 'border-accent text-accent')} onClick={() => toggle.mutate({ id: p.id, value: !p.isFeatured })}>
              <Star className={cn('size-4', p.isFeatured && 'fill-current')} aria-hidden="true" />
            </IconButton>
          </li>
        ))}
      </ul>
    </Card>
  );
}
