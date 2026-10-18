import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Reveal } from './Reveal';

export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('mx-auto w-full max-w-6xl px-5 sm:px-8', className)}>{children}</div>;
}

interface SectionProps {
  id: string;
  index?: string;
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Standard page section: numbered mono eyebrow, serif title, optional lead paragraph. */
export function Section({ id, index, eyebrow, title, description, children, className }: SectionProps) {
  return (
    <section id={id} data-section aria-labelledby={`${id}-title`} className={cn('relative py-20 sm:py-28', className)}>
      <Container>
        <Reveal>
          <header className="mb-12 max-w-2xl sm:mb-16">
            <p className="eyebrow">
              {index && <span className="mr-3 text-subtle">{index}</span>}
              {eyebrow}
            </p>
            <h2 id={`${id}-title`} className="mt-4 font-display text-4xl leading-[1.1] tracking-tight text-balance sm:text-5xl">
              {title}
            </h2>
            {description && <p className="mt-5 text-lg text-muted text-pretty">{description}</p>}
          </header>
        </Reveal>
        {children}
      </Container>
    </section>
  );
}
