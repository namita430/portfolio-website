import { useEffect, useState } from 'react';
import { AnimatePresence, useReducedMotion } from 'motion/react';
import * as m from 'motion/react-m';

/**
 * Cycles through the owner's role titles. Screen readers get the full list once (the animated text is hidden
 * from them); reduced-motion visitors see all roles statically instead of an animation.
 */
export function RotatingRoles({ roles }: { roles: string[] }) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduce || roles.length < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % roles.length), 2600);
    return () => clearInterval(id);
  }, [reduce, roles.length]);

  if (!roles.length) return null;

  return (
    <p className="flex items-center gap-2 font-mono text-sm text-muted sm:text-base">
      <span aria-hidden="true" className="text-accent">
        &gt;
      </span>
      <span className="sr-only">{roles.join(', ')}</span>
      {reduce ? (
        <span aria-hidden="true">{roles.join(' · ')}</span>
      ) : (
        <span aria-hidden="true" className="relative inline-flex h-[1.6em] overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <m.span
              key={roles[index]}
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '-100%', opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="inline-block whitespace-nowrap text-fg"
            >
              {roles[index]}
            </m.span>
          </AnimatePresence>
        </span>
      )}
    </p>
  );
}
