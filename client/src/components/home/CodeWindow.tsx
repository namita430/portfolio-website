import { useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react';
import { cn } from '@/lib/cn';
import type { Profile, ProjectListItem, SkillCategory } from '@/types/api';
import { buildSnippets, type TokenType } from './codeSnippets';

const tokenClass: Record<TokenType, string> = {
  kw: 'text-muted italic',
  key: 'text-fg',
  str: 'text-accent',
  punc: 'text-subtle',
  com: 'text-subtle italic',
  plain: 'text-fg',
};

interface CodeWindowProps {
  profile: Profile;
  skills?: SkillCategory[];
  projects?: ProjectListItem[];
  className?: string;
}

/**
 * Code-editor styled card that presents real profile data as TypeScript. Tabs are keyboard accessible
 * (arrow keys), lines reveal one after another, and the card tilts subtly toward the pointer.
 * Reduced-motion visitors get a static, fully visible snippet.
 */
export function CodeWindow({ profile, skills, projects, className }: CodeWindowProps) {
  const reduce = useReducedMotion();
  const snippets = useMemo(() => buildSnippets(profile, skills, projects), [profile, skills, projects]);
  const [active, setActive] = useState(0);
  const uid = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const current = snippets[Math.min(active, snippets.length - 1)]!;

  // pointer-driven tilt
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [3.5, -3.5]), { stiffness: 140, damping: 18 });
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-4.5, 4.5]), { stiffness: 140, damping: 18 });

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (reduce || e.pointerType === 'touch') return;
    const rect = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - rect.left) / rect.width - 0.5);
    py.set((e.clientY - rect.top) / rect.height - 0.5);
  };
  const resetTilt = () => {
    px.set(0);
    py.set(0);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const last = snippets.length - 1;
    let next = active;
    if (e.key === 'ArrowRight') next = active === last ? 0 : active + 1;
    else if (e.key === 'ArrowLeft') next = active === 0 ? last : active - 1;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = last;
    else return;
    e.preventDefault();
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <motion.div
      className={cn('[perspective:1100px]', className)}
      onPointerMove={onPointerMove}
      onPointerLeave={resetTilt}
      initial={reduce ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        style={reduce ? undefined : { rotateX, rotateY, transformStyle: 'preserve-3d' }}
        className="border-gradient overflow-hidden rounded-2xl bg-surface shadow-[0_40px_80px_-40px_rgb(0_0_0/0.7)]"
      >
        {/* window chrome */}
        <div className="flex items-center gap-3 border-b border-line bg-surface-2/60 px-4 pt-3">
          <div className="mb-3 flex gap-1.5" aria-hidden="true">
            <span className="size-2.5 rounded-full bg-line-strong" />
            <span className="size-2.5 rounded-full bg-line-strong" />
            <span className="size-2.5 rounded-full bg-line-strong" />
          </div>
          <div role="tablist" aria-label="Code samples" className="flex min-w-0 gap-1 overflow-x-auto" onKeyDown={onKeyDown}>
            {snippets.map((s, i) => (
              <button
                key={s.file}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                role="tab"
                id={`${uid}-tab-${i}`}
                aria-selected={i === active}
                aria-controls={`${uid}-panel`}
                tabIndex={i === active ? 0 : -1}
                onClick={() => setActive(i)}
                className={cn(
                  'relative -mb-px whitespace-nowrap rounded-t-md border border-b-0 px-3.5 py-2 font-mono text-xs transition-colors',
                  i === active ? 'border-line bg-surface text-fg' : 'border-transparent text-subtle hover:text-fg',
                )}
              >
                {s.file}
              </button>
            ))}
          </div>
        </div>

        {/* code */}
        <div id={`${uid}-panel`} role="tabpanel" aria-labelledby={`${uid}-tab-${active}`} tabIndex={0} className="min-h-[19rem] overflow-x-auto p-5 font-mono text-[0.8rem] leading-[1.75] sm:text-[0.84rem]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.ol key={current.file} initial="hidden" animate="show" exit={{ opacity: 0 }} transition={{ duration: 0.12 }} variants={{ hidden: {}, show: { transition: { staggerChildren: reduce ? 0 : 0.045, delayChildren: 0.1 } } }}>
              {current.lines.map((line, i) => (
                <motion.li key={i} className="flex whitespace-pre" variants={{ hidden: { opacity: 0, x: reduce ? 0 : -6 }, show: { opacity: 1, x: 0 } }}>
                  <span aria-hidden="true" className="mr-4 w-5 shrink-0 select-none text-right text-subtle/70">
                    {i + 1}
                  </span>
                  <span>
                    {line.map((tok, j) => (
                      <span key={j} className={tokenClass[tok.t]}>
                        {tok.v}
                      </span>
                    ))}
                    {i === current.lines.length - 1 && <span aria-hidden="true" className="caret ml-1" />}
                  </span>
                </motion.li>
              ))}
            </motion.ol>
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
