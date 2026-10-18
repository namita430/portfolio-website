import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Award, FileText, FolderKanban, Inbox, Plus, Route as RouteIcon, Settings2, UserRound } from 'lucide-react';
import { formatDateTime } from '@/lib/format';
import { buttonClasses } from '@/components/ui/Button';
import { ErrorState, Skeleton } from '@/components/ui/States';
import { adminApi } from '../adminApi';
import { Card, PageHeader, Pill, SectionTitle } from '../components/ui';

const KIND_LINK: Record<string, string> = { project: '/admin/projects', certificate: '/admin/certificates', journey: '/admin/journey', profile: '/admin/profile', settings: '/admin/settings', resume: '/admin/resume' };
const KIND_LABEL: Record<string, string> = { project: 'Project', certificate: 'Certificate', journey: 'Journey', profile: 'Profile', settings: 'Settings', resume: 'Resume' };

function Stat({ to, label, value, sub, icon: Icon, attention }: { to: string; label: string; value: number; sub: string; icon: typeof FolderKanban; attention?: boolean }) {
  return (
    <Link to={to} className="group rounded-2xl border border-line bg-surface p-5 transition hover:border-accent/50">
      <div className="flex items-center justify-between text-muted">
        <span className="text-sm">{label}</span>
        <Icon className="size-4 transition group-hover:text-accent" aria-hidden="true" />
      </div>
      <p className="mt-3 font-display text-4xl tracking-tight">{value}</p>
      <p className={attention ? 'mt-1 text-sm text-accent' : 'mt-1 text-sm text-subtle'}>{sub}</p>
    </Link>
  );
}

export function OverviewPage() {
  const q = useQuery({ queryKey: ['admin', 'overview'], queryFn: adminApi.overview });

  if (q.isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;

  const { counts, hasResume, recentActivity, recentMessages } = q.data;
  const draftCerts = counts.certificates.total - counts.certificates.published;

  return (
    <>
      <PageHeader title="Overview" description="What is live on the website right now, and what needs attention." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat to="/admin/projects" label="Projects" icon={FolderKanban} value={counts.projects.published} sub={`${counts.projects.total} total · ${counts.projects.total - counts.projects.published} draft`} />
        <Stat to="/admin/certificates" label="Certificates" icon={Award} value={counts.certificates.published} sub={`${counts.certificates.total} total · ${draftCerts} draft`} attention={draftCerts > 0} />
        <Stat to="/admin/journey" label="Journey entries" icon={RouteIcon} value={counts.journey.published} sub={`${counts.journey.total} total`} />
        <Stat to="/admin/messages" label="Unread messages" icon={Inbox} value={counts.messages.unread} sub={`${counts.messages.total} total`} attention={counts.messages.unread > 0} />
      </div>

      {(!hasResume || draftCerts > 0) && (
        <Card className="mt-6 border-accent/40">
          <SectionTitle>Needs attention</SectionTitle>
          <ul className="space-y-2 text-sm text-muted">
            {!hasResume && (
              <li>
                No resume uploaded yet — visitors will not see a download button.{' '}
                <Link to="/admin/resume" className="text-accent underline underline-offset-2 hover:no-underline">
                  Upload one
                </Link>
              </li>
            )}
            {draftCerts > 0 && (
              <li>
                {draftCerts} certificate{draftCerts === 1 ? ' is' : 's are'} still a draft. Attach the certificate file or a verification link, then publish.{' '}
                <Link to="/admin/certificates" className="text-accent underline underline-offset-2 hover:no-underline">
                  Review
                </Link>
              </li>
            )}
          </ul>
        </Card>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <Link to="/admin/projects/new" className={buttonClasses('primary', 'sm')}>
          <Plus className="size-4" aria-hidden="true" /> New project
        </Link>
        <Link to="/admin/certificates/new" className={buttonClasses('secondary', 'sm')}>
          <Plus className="size-4" aria-hidden="true" /> New certificate
        </Link>
        <Link to="/admin/journey/new" className={buttonClasses('secondary', 'sm')}>
          <Plus className="size-4" aria-hidden="true" /> New journey entry
        </Link>
        <Link to="/admin/profile" className={buttonClasses('ghost', 'sm')}>
          <UserRound className="size-4" aria-hidden="true" /> Edit profile
        </Link>
        <Link to="/admin/resume" className={buttonClasses('ghost', 'sm')}>
          <FileText className="size-4" aria-hidden="true" /> Resume
        </Link>
        <Link to="/admin/settings" className={buttonClasses('ghost', 'sm')}>
          <Settings2 className="size-4" aria-hidden="true" /> Settings
        </Link>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle>Recent updates</SectionTitle>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-muted">Nothing yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {recentActivity.map((a, i) => (
                <li key={`${a.kind}-${a.id ?? i}`} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link to={a.id ? `${KIND_LINK[a.kind]}/${a.id}` : (KIND_LINK[a.kind] ?? '/admin')} className="block truncate hover:text-accent">
                      {a.title}
                    </Link>
                    <p className="text-xs text-subtle">
                      {KIND_LABEL[a.kind] ?? a.kind} · {formatDateTime(a.at)}
                    </p>
                  </div>
                  {a.isPublished !== undefined && <Pill tone={a.isPublished ? 'good' : 'muted'}>{a.isPublished ? 'Published' : 'Draft'}</Pill>}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <SectionTitle>Recent messages</SectionTitle>
          {recentMessages.length === 0 ? (
            <p className="text-sm text-muted">No messages yet. They appear here when someone uses the contact form.</p>
          ) : (
            <ul className="divide-y divide-line">
              {recentMessages.map((m) => (
                <li key={m.id} className="py-3">
                  <Link to="/admin/messages" className="flex items-center justify-between gap-3 hover:text-accent">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{m.subject}</span>
                      <span className="block text-xs text-subtle">
                        {m.name} · {formatDateTime(m.createdAt)}
                      </span>
                    </span>
                    {!m.isRead && <Pill tone="warn">New</Pill>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
