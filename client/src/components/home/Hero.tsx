import { motion, useReducedMotion } from 'motion/react';
import { Link } from 'react-router-dom';
import { ArrowDownToLine, ArrowRight } from 'lucide-react';
import { useProjects, useSite, useSkills } from '@/hooks/usePublicData';
import { useSections } from '@/hooks/useSections';
import { safeHref } from '@/lib/url';
import { buttonClasses } from '@/components/ui/Button';
import { Container } from '@/components/ui/Layout';
import { GitHubIcon, LinkedInIcon } from '@/components/ui/icons';
import { CodeWindow } from './CodeWindow';
import { RotatingRoles } from './RotatingRoles';

/** Emphasises the last two words of the headline in the accent colour (works for any headline the owner writes). */
function Headline({ text }: { text: string }) {
  const words = text.trim().split(/\s+/);
  if (words.length < 4) return <>{text}</>;
  const head = words.slice(0, -2).join(' ');
  const tail = words.slice(-2).join(' ');
  return (
    <>
      {head} <em className="font-normal italic text-accent">{tail}</em>
    </>
  );
}

export function Hero() {
  const reduce = useReducedMotion();
  const site = useSite();
  const skills = useSkills();
  const projects = useProjects({ pageSize: 6, sort: 'order' });
  const { enabled } = useSections();
  if (!site.data) return null;

  const { profile, settings, resume } = site.data;
  const resumeHref = safeHref(resume?.url);
  const github = safeHref(profile.githubUrl);
  const linkedin = safeHref(profile.linkedinUrl);
  const exploreTarget = enabled.has('projects') ? '#projects' : enabled.has('about') ? '#about' : '';

  const item = (delay: number) => ({
    initial: reduce ? false : { opacity: 0, y: 22 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] as const },
  });

  const iconLink =
    'inline-flex size-11 items-center justify-center rounded-full border border-line-strong text-muted transition hover:border-accent hover:text-accent';

  return (
    <section data-section id="home" aria-labelledby="hero-title" className="relative isolate overflow-hidden">
      <div aria-hidden="true" className="accent-glow absolute inset-x-0 top-0 -z-10 h-[34rem]" />
      <div aria-hidden="true" className="bg-grid absolute inset-0 -z-10 opacity-60" />

      <Container className="grid items-center gap-14 pb-24 pt-14 sm:pt-20 lg:grid-cols-[1.08fr_0.92fr] lg:gap-10 lg:pb-32 lg:pt-28">
        <div>
          <motion.div {...item(0)}>
            <RotatingRoles roles={profile.titles} />
          </motion.div>

          <motion.h1 {...item(0.08)} id="hero-title" className="mt-6 font-display text-[2.6rem] leading-[1.04] tracking-tight text-balance sm:text-6xl lg:text-[4.4rem]">
            <Headline text={settings.heroHeadline} />
          </motion.h1>

          <motion.p {...item(0.16)} className="mt-6 max-w-xl text-lg leading-relaxed text-muted text-pretty sm:text-xl">
            {settings.heroSubtext}
          </motion.p>

          <motion.div {...item(0.24)} className="mt-9 flex flex-wrap items-center gap-3">
            {exploreTarget && (
              <Link to={{ pathname: '/', hash: exploreTarget }} className={buttonClasses('primary', 'lg')}>
                Explore My Work <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            )}
            {enabled.has('contact') ? (
              <Link to={{ pathname: '/', hash: '#contact' }} className={buttonClasses('secondary', 'lg')}>
                Let&rsquo;s Connect
              </Link>
            ) : (
              <a href={`mailto:${profile.email}`} className={buttonClasses('secondary', 'lg')}>
                Let&rsquo;s Connect
              </a>
            )}
            {settings.showResumeButton && resumeHref && (
              <a href={resumeHref} download className={buttonClasses('ghost', 'lg')}>
                <ArrowDownToLine className="size-4" aria-hidden="true" /> Resume
              </a>
            )}
          </motion.div>

          <motion.div {...item(0.32)} className="mt-9 flex items-center gap-3">
            {github && (
              <a href={github} target="_blank" rel="noopener noreferrer" className={iconLink} aria-label="GitHub profile (opens in a new tab)">
                <GitHubIcon className="size-5" />
              </a>
            )}
            {linkedin && (
              <a href={linkedin} target="_blank" rel="noopener noreferrer" className={iconLink} aria-label="LinkedIn profile (opens in a new tab)">
                <LinkedInIcon className="size-[1.15rem]" />
              </a>
            )}
            <span className="ml-1 font-mono text-xs uppercase tracking-[0.14em] text-subtle">{profile.location}</span>
          </motion.div>
        </div>

        <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
          {profile.profileImage && (
            <motion.div {...item(0.2)} className="border-gradient relative ml-auto aspect-[4/5] w-48 overflow-hidden rounded-3xl bg-surface sm:w-60">
              <img
                src={profile.profileImage.url}
                alt={`Portrait of ${profile.fullName}`}
                width={profile.profileImage.width ?? undefined}
                height={profile.profileImage.height ?? undefined}
                className="size-full object-cover"
                fetchPriority="high"
              />
            </motion.div>
          )}
          <CodeWindow profile={profile} skills={skills.data} projects={projects.data?.data} className={profile.profileImage ? '-mt-24 mr-auto w-[92%]' : ''} />
        </div>
      </Container>
    </section>
  );
}
