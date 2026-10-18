import { Link } from 'react-router-dom';
import { ArrowUp, Mail } from 'lucide-react';
import { useSite } from '@/hooks/usePublicData';
import { useSections } from '@/hooks/useSections';
import { safeHref } from '@/lib/url';
import { Container } from '@/components/ui/Layout';
import { GitHubIcon, LinkedInIcon } from '@/components/ui/icons';

export function Footer() {
  const site = useSite();
  const { nav } = useSections();
  if (!site.data) return null;
  const { profile, settings } = site.data;
  const github = safeHref(profile.githubUrl);
  const linkedin = safeHref(profile.linkedinUrl);

  const iconLink = 'inline-flex size-10 items-center justify-center rounded-full border border-line-strong text-muted transition hover:border-accent hover:text-accent';

  return (
    <footer className="relative border-t border-line">
      <Container className="py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <p className="font-display text-2xl">{profile.fullName}</p>
            {profile.objective && <p className="mt-3 max-w-sm text-sm text-muted text-pretty">{profile.objective}</p>}
            <div className="mt-6 flex items-center gap-2">
              {github && (
                <a href={github} target="_blank" rel="noopener noreferrer" className={iconLink} aria-label="GitHub (opens in a new tab)">
                  <GitHubIcon className="size-[1.15rem]" />
                </a>
              )}
              {linkedin && (
                <a href={linkedin} target="_blank" rel="noopener noreferrer" className={iconLink} aria-label="LinkedIn (opens in a new tab)">
                  <LinkedInIcon className="size-[1.1rem]" />
                </a>
              )}
              <a href={`mailto:${profile.email}`} className={iconLink} aria-label={`Email ${profile.email}`}>
                <Mail className="size-[1.1rem]" aria-hidden="true" />
              </a>
            </div>
          </div>

          <nav aria-label="Footer">
            <p className="eyebrow mb-4 text-subtle">Explore</p>
            <ul className="space-y-2.5 text-sm">
              {nav.map((item) => (
                <li key={item.id}>
                  <Link to={{ pathname: '/', hash: `#${item.id}` }} className="text-muted transition hover:text-fg">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <p className="eyebrow mb-4 text-subtle">Contact</p>
            <ul className="space-y-2.5 text-sm text-muted">
              <li>
                <a href={`mailto:${profile.email}`} className="transition hover:text-fg">
                  {profile.email}
                </a>
              </li>
              <li>{profile.location}</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-line pt-6 text-sm text-subtle sm:flex-row sm:items-center">
          <p>
            © {new Date().getFullYear()} {profile.fullName}. {settings.footerText}
          </p>
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
            }}
            className="inline-flex items-center gap-1.5 text-muted transition hover:text-accent"
          >
            Back to top <ArrowUp className="size-4" aria-hidden="true" />
          </a>
        </div>
      </Container>
    </footer>
  );
}
