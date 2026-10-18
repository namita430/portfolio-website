import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/**
 * Handles scroll position on navigation:
 *  - "/#contact" scrolls to the section (waiting up to ~4s for lazily-rendered sections to appear)
 *  - any other route change starts at the top
 */
export function ScrollManager() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }
    const id = decodeURIComponent(hash.slice(1));
    let frame = 0;
    const started = performance.now();
    const tryScroll = () => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
        return;
      }
      if (performance.now() - started < 4000) frame = requestAnimationFrame(tryScroll);
    };
    frame = requestAnimationFrame(tryScroll);
    return () => cancelAnimationFrame(frame);
  }, [pathname, hash]);

  return null;
}
