import type { ReactNode } from 'react';
import { useReducedMotion } from 'motion/react';
import * as m from 'motion/react-m';

interface RevealProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  /** Distance in px to travel while fading in. */
  y?: number;
}

/**
 * Fades content up once when scrolled into view. Visitors who ask for reduced motion get the content straight away,
 * with no hiding and no animation at all (printing is handled in the stylesheet).
 */
export function Reveal({ children, delay = 0, className, y = 18 }: RevealProps) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return <div className={className}>{children}</div>;

  return (
    <m.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -8% 0px' }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </m.div>
  );
}
