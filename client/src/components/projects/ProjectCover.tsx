import { cn } from '@/lib/cn';
import { initials } from '@/lib/format';
import type { Asset } from '@/types/api';

interface ProjectCoverProps {
  title: string;
  category: string;
  image: Asset | null;
  className?: string;
  /** Mark the first visible cover as high priority so it paints quickly. */
  priority?: boolean;
}

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/** Decorative backgrounds for projects without an image yet. Purely abstract — never a fake screenshot. */
const patterns = [
  'radial-gradient(circle at 1px 1px, var(--line-strong) 1px, transparent 0) 0 0 / 22px 22px',
  'repeating-linear-gradient(135deg, var(--line) 0 1px, transparent 1px 16px)',
  'repeating-radial-gradient(circle at 80% 120%, var(--line) 0 1px, transparent 1px 22px)',
];

export function ProjectCover({ title, category, image, className, priority }: ProjectCoverProps) {
  if (image) {
    return (
      <div className={cn('relative aspect-[16/10] overflow-hidden bg-surface-2', className)}>
        <img
          src={image.url}
          alt={`${title} cover image`}
          width={image.width ?? undefined}
          height={image.height ?? undefined}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          className="size-full object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.03]"
        />
      </div>
    );
  }

  return (
    <div aria-hidden="true" className={cn('relative aspect-[16/10] overflow-hidden bg-surface-2', className)}>
      <div className="absolute inset-0 opacity-80" style={{ background: patterns[hash(title) % patterns.length] }} />
      <div className="absolute inset-0 bg-gradient-to-br from-accent-soft via-transparent to-transparent" />
      <span className="absolute inset-0 grid place-items-center font-display text-7xl font-light italic text-accent/80 transition-transform duration-700 ease-out-expo group-hover:scale-105 sm:text-8xl">
        {initials(title)}
      </span>
      <span className="absolute bottom-3 left-4 font-mono text-[0.68rem] uppercase tracking-[0.16em] text-subtle">{category}</span>
    </div>
  );
}
