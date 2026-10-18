import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, Loader2, Mail, MapPin, Send } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { safeHref } from '@/lib/url';
import { useSite } from '@/hooks/usePublicData';
import { useSectionIndex } from '@/hooks/useSections';
import { publicApi } from '@/services/publicApi';
import { Button } from '@/components/ui/Button';
import { GitHubIcon, LinkedInIcon } from '@/components/ui/icons';
import { Section } from '@/components/ui/Layout';
import { Reveal } from '@/components/ui/Reveal';
import { Turnstile } from './Turnstile';

const schema = z.object({
  name: z.string().trim().min(2, 'Please enter your name.').max(120, 'That name is too long.'),
  email: z.email('Enter a valid email address.').max(190),
  subject: z.string().trim().min(3, 'Add a short subject.').max(200, 'Please keep the subject under 200 characters.'),
  message: z.string().trim().min(10, 'Please write at least 10 characters.').max(5000, 'Please keep your message under 5,000 characters.'),
  website: z.string().max(0).optional(), // honeypot
});
type FormValues = z.infer<typeof schema>;

const TURNSTILE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim();

const inputClass =
  'w-full rounded-xl border border-line-strong bg-bg px-4 py-3 text-fg placeholder:text-subtle transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40 aria-[invalid=true]:border-danger';

function FieldError({ id, message }: { id: string; message?: string }) {
  return (
    <p id={id} role="alert" className="mt-1.5 min-h-5 text-sm text-danger">
      {message}
    </p>
  );
}

export function Contact() {
  const site = useSite();
  const sectionIndex = useSectionIndex('contact');
  const startedAt = useRef(Date.now()); // the server rejects submissions that arrive implausibly fast
  const [status, setStatus] = useState<'idle' | 'sent'>('idle');
  const [formError, setFormError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { name: '', email: '', subject: '', message: '', website: '' } });

  if (!site.data) return null;
  const { profile } = site.data;
  const github = safeHref(profile.githubUrl);
  const linkedin = safeHref(profile.linkedinUrl);
  const messageLength = watch('message')?.length ?? 0;

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    if (TURNSTILE_KEY && !token) {
      setFormError('Please complete the human-verification check below.');
      return;
    }
    try {
      await publicApi.sendMessage({ ...values, startedAt: startedAt.current, turnstileToken: token ?? undefined });
      setStatus('sent');
      reset();
    } catch (err) {
      if (err instanceof ApiError && err.details?.length) {
        for (const d of err.details) {
          if (d.path in schema.shape) setError(d.path as keyof FormValues, { message: d.message });
        }
      }
      setFormError(err instanceof ApiError ? err.message : 'Your message could not be sent. Please try again.');
    } finally {
      if (TURNSTILE_KEY) setResetKey((k) => k + 1);
    }
  });

  const link = 'group inline-flex items-center gap-3 text-muted transition hover:text-accent';

  return (
    <Section id="contact" index={sectionIndex} eyebrow="Contact" title="Let's talk." description="Have a project in mind, a question, or an opportunity to share? Send a message using the form or reach out directly.">
      <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <Reveal>
          <ul className="space-y-5 text-lg">
            <li>
              <a href={`mailto:${profile.email}`} className={link}>
                <Mail className="size-5 text-accent" aria-hidden="true" />
                <span className="break-all">{profile.email}</span>
              </a>
            </li>
            <li className="flex items-center gap-3 text-muted">
              <MapPin className="size-5 text-accent" aria-hidden="true" />
              {profile.location}
            </li>
            {github && (
              <li>
                <a href={github} target="_blank" rel="noopener noreferrer" className={link}>
                  <GitHubIcon className="size-5 text-accent" /> GitHub
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            )}
            {linkedin && (
              <li>
                <a href={linkedin} target="_blank" rel="noopener noreferrer" className={link}>
                  <LinkedInIcon className="size-5 text-accent" /> LinkedIn
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            )}
          </ul>
        </Reveal>

        <Reveal delay={0.08}>
          <div className="border-gradient rounded-3xl bg-surface p-6 sm:p-9">
            {status === 'sent' ? (
              <div role="status" className="py-8 text-center">
                <CheckCircle2 className="mx-auto size-12 text-success" aria-hidden="true" />
                <h3 className="mt-5 font-display text-3xl">Message received</h3>
                <p className="mx-auto mt-3 max-w-sm text-muted">Thank you for reaching out. Your message has been saved.</p>
                <Button variant="secondary" className="mt-7" onClick={() => setStatus('idle')}>
                  Send another message
                </Button>
              </div>
            ) : (
              <form onSubmit={onSubmit} noValidate aria-label="Contact form" className="grid gap-x-5 gap-y-1 sm:grid-cols-2">
                <div>
                  <label htmlFor="c-name" className="mb-1.5 block text-sm font-medium">
                    Name
                  </label>
                  <input id="c-name" autoComplete="name" className={inputClass} aria-invalid={!!errors.name} aria-describedby="c-name-err" {...register('name')} />
                  <FieldError id="c-name-err" message={errors.name?.message} />
                </div>
                <div>
                  <label htmlFor="c-email" className="mb-1.5 block text-sm font-medium">
                    Email
                  </label>
                  <input id="c-email" type="email" autoComplete="email" className={inputClass} aria-invalid={!!errors.email} aria-describedby="c-email-err" {...register('email')} />
                  <FieldError id="c-email-err" message={errors.email?.message} />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="c-subject" className="mb-1.5 block text-sm font-medium">
                    Subject
                  </label>
                  <input id="c-subject" className={inputClass} aria-invalid={!!errors.subject} aria-describedby="c-subject-err" {...register('subject')} />
                  <FieldError id="c-subject-err" message={errors.subject?.message} />
                </div>
                <div className="sm:col-span-2">
                  <div className="mb-1.5 flex items-baseline justify-between">
                    <label htmlFor="c-message" className="text-sm font-medium">
                      Message
                    </label>
                    <span className="font-mono text-xs text-subtle" aria-hidden="true">
                      {messageLength}/5000
                    </span>
                  </div>
                  <textarea id="c-message" rows={6} className={`${inputClass} resize-y`} aria-invalid={!!errors.message} aria-describedby="c-message-err" {...register('message')} />
                  <FieldError id="c-message-err" message={errors.message?.message} />
                </div>

                {/* Honeypot: hidden from people and assistive tech; bots tend to fill every field. */}
                <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                  <label htmlFor="c-website">Leave this field empty</label>
                  <input id="c-website" tabIndex={-1} autoComplete="off" {...register('website')} />
                </div>

                {TURNSTILE_KEY && (
                  <div className="sm:col-span-2">
                    <Turnstile siteKey={TURNSTILE_KEY} onToken={setToken} resetKey={resetKey} />
                  </div>
                )}

                <div className="mt-2 flex flex-col gap-4 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
                  <p role="alert" aria-live="assertive" className="min-h-6 text-sm text-danger">
                    {formError}
                  </p>
                  <Button type="submit" size="lg" disabled={isSubmitting} aria-busy={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Sending…
                      </>
                    ) : (
                      <>
                        Send message <Send className="size-4" aria-hidden="true" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
