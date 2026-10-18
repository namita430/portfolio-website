import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useSite } from '@/hooks/usePublicData';
import { applyTheme } from '@/lib/theme';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { ScrollManager } from '@/components/layout/ScrollManager';
import { ErrorState } from '@/components/ui/States';

/** Shown while the first request is in flight. Free-tier servers can take ~1 minute to wake, so say so. */
function Splash({ waking }: { waking: boolean }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 4000);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="grid min-h-dvh place-items-center px-6 text-center" role="status" aria-live="polite">
      <div>
        <p className="font-display text-3xl italic tracking-tight">
          Namita Giri<span className="text-accent">.</span>
        </p>
        <div className="mx-auto mt-6 h-px w-40 overflow-hidden bg-line">
          <div className="h-full w-1/3 bg-accent" style={{ animation: 'splash 1.4s ease-in-out infinite' }} />
        </div>
        {(slow || waking) && (
          <p className="mx-auto mt-6 max-w-xs text-sm text-muted">
            Waking up the server — this can take up to a minute after a quiet period. Thanks for your patience.
          </p>
        )}
        <style>{'@keyframes splash{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}'}</style>
      </div>
    </div>
  );
}

export function PublicLayout() {
  const site = useSite();
  const theme = site.data?.settings.theme;

  useEffect(() => {
    if (theme) applyTheme(theme);
  }, [theme]);

  if (site.isPending) return <Splash waking={site.failureCount > 0} />;

  if (site.isError) {
    return (
      <div className="grid min-h-dvh place-items-center px-6">
        <ErrorState title="The site could not be loaded" error={site.error} onRetry={() => void site.refetch()} className="max-w-lg" />
      </div>
    );
  }

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <ScrollManager />
      <Navbar />
      <main id="main" tabIndex={-1} className="outline-none">
        <div id="top" />
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
