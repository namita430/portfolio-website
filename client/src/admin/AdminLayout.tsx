import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Award, ExternalLink, FileText, FolderKanban, Inbox, KeyRound, LayoutDashboard, LogOut, Menu, Route as RouteIcon, Settings2, UserRound, Wrench, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { applyTheme } from '@/lib/theme';
import { publicApi } from '@/services/publicApi';
import { useAuth } from './auth';
import { adminApi } from './adminApi';
import { useToast } from './components/Feedback';

const NAV: Array<{ to: string; label: string; icon: LucideIcon; end?: boolean }> = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/projects', label: 'Projects', icon: FolderKanban },
  { to: '/admin/certificates', label: 'Certificates', icon: Award },
  { to: '/admin/journey', label: 'Journey', icon: RouteIcon },
  { to: '/admin/profile', label: 'Profile', icon: UserRound },
  { to: '/admin/skills', label: 'Skills', icon: Wrench },
  { to: '/admin/resume', label: 'Resume', icon: FileText },
  { to: '/admin/messages', label: 'Messages', icon: Inbox },
  { to: '/admin/settings', label: 'Settings', icon: Settings2 },
  { to: '/admin/account', label: 'Account', icon: KeyRound },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const toast = useToast();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  // The dashboard uses the same colour theme the owner picked for the public site.
  const site = useQuery({ queryKey: ['site'], queryFn: publicApi.site, staleTime: 60_000 });
  useEffect(() => {
    if (site.data) applyTheme(site.data.settings.theme);
  }, [site.data]);

  const overview = useQuery({ queryKey: ['admin', 'overview'], queryFn: adminApi.overview, refetchInterval: 60_000 });
  const unread = overview.data?.counts.messages.unread ?? 0;

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => window.scrollTo({ top: 0 }), [pathname]);

  async function signOut() {
    try {
      await logout();
    } catch (err) {
      toast.fromError(err, 'Could not sign out cleanly.');
    }
  }

  const nav = (
    <nav aria-label="Admin" className="flex flex-col gap-1">
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[0.95rem] transition-colors',
              isActive ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-surface-2 hover:text-fg',
            )
          }
        >
          <Icon className="size-[1.1rem]" aria-hidden="true" />
          <span className="flex-1">{label}</span>
          {label === 'Messages' && unread > 0 && (
            <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-fg" aria-label={`${unread} unread`}>
              {unread}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );

  const footer = (
    <div className="space-y-1 border-t border-line pt-4">
      <p className="truncate px-3.5 pb-2 text-xs text-subtle">Signed in as {user?.displayName || user?.username}</p>
      <Link to="/" target="_blank" className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[0.95rem] text-muted transition hover:bg-surface-2 hover:text-fg">
        <ExternalLink className="size-[1.1rem]" aria-hidden="true" /> View site
        <span className="sr-only"> (opens in a new tab)</span>
      </Link>
      <button type="button" onClick={() => void signOut()} className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-[0.95rem] text-muted transition hover:bg-surface-2 hover:text-danger">
        <LogOut className="size-[1.1rem]" aria-hidden="true" /> Sign out
      </button>
    </div>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
      <a href="#admin-main" className="skip-link">
        Skip to content
      </a>

      {/* desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col justify-between border-r border-line bg-surface/50 p-5 lg:flex">
        <div>
          <Link to="/admin" className="mb-8 flex items-center gap-2.5 px-1">
            <span aria-hidden="true" className="grid size-9 place-items-center rounded-lg border border-accent/40 bg-accent-soft font-display font-semibold italic text-accent">
              NG
            </span>
            <span>
              <span className="block font-display text-lg leading-tight">Dashboard</span>
              <span className="block text-xs text-subtle">Portfolio admin</span>
            </span>
          </Link>
          {nav}
        </div>
        {footer}
      </aside>

      {/* mobile top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-line bg-bg/90 px-4 py-3 backdrop-blur lg:hidden">
        <Link to="/admin" className="font-display text-lg">
          Dashboard
        </Link>
        <button
          type="button"
          aria-expanded={open}
          aria-controls="admin-mobile-nav"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex size-10 items-center justify-center rounded-full border border-line-strong"
        >
          {open ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
        </button>
      </header>
      {open && (
        <div id="admin-mobile-nav" className="space-y-4 border-b border-line bg-bg p-4 lg:hidden">
          {nav}
          {footer}
        </div>
      )}

      <main id="admin-main" tabIndex={-1} className="min-w-0 px-4 py-8 outline-none sm:px-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
