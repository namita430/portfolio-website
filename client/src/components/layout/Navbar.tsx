import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useSite } from '@/hooks/usePublicData';
import { useSections } from '@/hooks/useSections';
import { useActiveSection } from '@/hooks/useActiveSection';
import { buttonClasses } from '@/components/ui/Button';

export function Navbar() {
  const site = useSite();
  const { nav, enabled } = useSections();
  const { pathname } = useLocation();
  const onHome = pathname === '/';
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const active = useActiveSection(
    nav.map((n) => n.id),
    onHome,
  );

  const name = site.data?.profile.fullName ?? 'Namita Giri';
  const connectTo = enabled.has('contact') ? { pathname: '/', hash: '#contact' } : undefined;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the mobile menu on navigation or Escape, and give focus back to the toggle.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const linkClass = (id: string) =>
    cn(
      'relative rounded-full px-3.5 py-2 text-sm transition-colors',
      active === id && onHome ? 'text-fg' : 'text-muted hover:text-fg',
    );

  return (
    <header
      className={cn(
        'sticky top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-300',
        scrolled || open ? 'border-b border-line bg-bg/80 backdrop-blur-xl' : 'border-b border-transparent',
      )}
    >
      <nav aria-label="Primary" className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link to={{ pathname: '/', hash: '' }} className="group flex items-center gap-2.5" aria-label={`${name} — home`}>
          <span aria-hidden="true" className="grid size-8 place-items-center rounded-lg border border-accent/40 bg-accent-soft font-display text-[0.95rem] font-semibold italic text-accent transition group-hover:bg-accent group-hover:text-accent-fg">
            {name
              .split(' ')
              .map((p) => p[0])
              .slice(0, 2)
              .join('')}
          </span>
          <span className="font-display text-lg tracking-tight">{name}</span>
        </Link>

        <ul className="hidden items-center gap-0.5 lg:flex">
          <li>
            <Link to={{ pathname: '/', hash: '' }} className={linkClass('top')} aria-current={active === 'top' && onHome ? 'page' : undefined}>
              Home
            </Link>
          </li>
          {nav.map((item) => (
            <li key={item.id}>
              <Link to={{ pathname: '/', hash: `#${item.id}` }} className={linkClass(item.id)} aria-current={active === item.id && onHome ? 'location' : undefined}>
                {item.label}
                {active === item.id && onHome && (
                  <motion.span layoutId="nav-dot" className="absolute inset-x-3.5 -bottom-0.5 h-px bg-accent" aria-hidden="true" />
                )}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          {connectTo ? (
            <Link to={connectTo} className={buttonClasses('primary', 'sm', 'hidden sm:inline-flex')}>
              Let&rsquo;s Connect
            </Link>
          ) : (
            site.data && (
              <a href={`mailto:${site.data.profile.email}`} className={buttonClasses('primary', 'sm', 'hidden sm:inline-flex')}>
                Let&rsquo;s Connect
              </a>
            )
          )}
          <button
            ref={toggleRef}
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-full border border-line-strong text-fg transition hover:border-accent hover:text-accent lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
          </button>
        </div>
      </nav>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id="mobile-menu"
            key="mobile-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t border-line bg-bg/95 backdrop-blur-xl lg:hidden"
          >
            <ul className="mx-auto flex max-w-6xl flex-col gap-1 px-5 py-4 sm:px-8">
              <li>
                <Link to={{ pathname: '/', hash: '' }} className="block rounded-lg px-3 py-3 text-lg hover:bg-surface-2">
                  Home
                </Link>
              </li>
              {nav.map((item) => (
                <li key={item.id}>
                  <Link to={{ pathname: '/', hash: `#${item.id}` }} className="block rounded-lg px-3 py-3 text-lg hover:bg-surface-2">
                    {item.label}
                  </Link>
                </li>
              ))}
              {connectTo && (
                <li className="pt-2">
                  <Link to={connectTo} className={buttonClasses('primary', 'lg', 'w-full')}>
                    Let&rsquo;s Connect
                  </Link>
                </li>
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
