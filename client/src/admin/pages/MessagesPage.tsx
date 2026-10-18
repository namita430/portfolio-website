import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ChevronDown, Mail, MailOpen, Reply, Search, Trash2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatDateTime } from '@/lib/format';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States';
import type { ContactMessage } from '@/types/api';
import { adminApi } from '../adminApi';
import { useConfirm, useToast } from '../components/Feedback';
import { Pagination } from '../components/Pagination';
import { IconButton, Input, PageHeader, Pill } from '../components/ui';
import { useRefresh } from '../hooks';

type Filter = 'all' | 'unread' | 'read';

const EMAIL_LABEL: Record<ContactMessage['emailStatus'], { text: string; tone: 'good' | 'muted' | 'bad' }> = {
  SENT: { text: 'Email alert sent', tone: 'good' },
  NOT_CONFIGURED: { text: 'Email alerts not set up', tone: 'muted' },
  FAILED: { text: 'Email alert failed', tone: 'bad' },
};

export function MessagesPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const refresh = useRefresh();
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(q);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const list = useQuery({ queryKey: ['admin', 'messages', filter, search, page], queryFn: () => adminApi.messages({ status: filter, q: search || undefined, page, pageSize: 15 }) });
  const items = list.data?.data ?? [];

  const run = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => void refresh(),
    onError: (err) => toast.fromError(err),
  });

  function toggle(m: ContactMessage) {
    const opening = open !== m.id;
    setOpen(opening ? m.id : null);
    if (opening && !m.isRead) run.mutate(() => adminApi.setMessageRead(m.id, true)); // opening a message marks it read
  }

  async function remove(m: ContactMessage) {
    if (!(await confirm({ title: 'Delete this message?', message: `The message from ${m.name} will be permanently deleted.`, confirmLabel: 'Delete message', danger: true }))) return;
    run.mutate(() => adminApi.deleteMessage(m.id), { onSuccess: () => toast.success('Message deleted.') });
  }

  const tabs: Array<{ id: Filter; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'unread', label: `Unread${list.data?.meta.unread ? ` (${list.data.meta.unread})` : ''}` },
    { id: 'read', label: 'Read' },
  ];

  return (
    <>
      <PageHeader title="Messages" description="Everything sent through the website's contact form. Messages are stored in your database." />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div role="group" aria-label="Filter messages" className="flex gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={filter === t.id}
              onClick={() => {
                setFilter(t.id);
                setPage(1);
              }}
              className={cn('rounded-full border px-4 py-1.5 text-sm transition', filter === t.id ? 'border-accent bg-accent text-accent-fg' : 'border-line-strong text-muted hover:border-accent hover:text-accent')}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <label htmlFor="msg-search" className="sr-only">
            Search messages
          </label>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden="true" />
          <Input id="msg-search" type="search" placeholder="Search name, email, subject or text…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-10" />
        </div>
      </div>

      {list.isPending && <Skeleton className="h-64" />}
      {list.isError && <ErrorState error={list.error} onRetry={() => void list.refetch()} />}
      {list.data && items.length === 0 && <EmptyState title={search || filter !== 'all' ? 'No messages match' : 'No messages yet'}>When someone uses the contact form, their message appears here.</EmptyState>}

      {items.length > 0 && (
        <ul className="space-y-3">
          {items.map((m) => {
            const expanded = open === m.id;
            const email = EMAIL_LABEL[m.emailStatus];
            return (
              <li key={m.id} className={cn('rounded-2xl border bg-surface transition-colors', m.isRead ? 'border-line' : 'border-accent/50')}>
                <h2 className="m-0">
                  <button type="button" aria-expanded={expanded} aria-controls={`msg-${m.id}`} onClick={() => toggle(m)} className="flex w-full items-center gap-4 p-4 text-left">
                    <span aria-hidden="true" className={cn('size-2.5 shrink-0 rounded-full', m.isRead ? 'bg-transparent' : 'bg-accent')} />
                    <span className="min-w-0 flex-1">
                      <span className={cn('block truncate', !m.isRead && 'font-semibold')}>{m.subject}</span>
                      <span className="block truncate text-sm text-muted">
                        {m.name} &lt;{m.email}&gt; · {formatDateTime(m.createdAt)}
                      </span>
                      {!m.isRead && <span className="sr-only">Unread</span>}
                    </span>
                    <ChevronDown className={cn('size-5 shrink-0 text-subtle transition-transform', expanded && 'rotate-180')} aria-hidden="true" />
                  </button>
                </h2>
                {expanded && (
                  <div id={`msg-${m.id}`} className="border-t border-line p-4 sm:px-6">
                    {/* Rendered as plain text: React escapes it, so any HTML a visitor typed stays inert. */}
                    <p className="whitespace-pre-wrap break-words text-[0.95rem] leading-relaxed">{m.message}</p>
                    <div className="mt-5 flex flex-wrap items-center gap-2">
                      <a
                        href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject}`)}`}
                        className="inline-flex h-9 items-center gap-2 rounded-full bg-accent px-4 text-sm font-medium text-accent-fg hover:brightness-110"
                      >
                        <Reply className="size-4" aria-hidden="true" /> Reply by email
                      </a>
                      <IconButton label={m.isRead ? 'Mark as unread' : 'Mark as read'} className="w-auto gap-2 px-3 text-sm" onClick={() => run.mutate(() => adminApi.setMessageRead(m.id, !m.isRead))}>
                        {m.isRead ? <Mail className="size-4" aria-hidden="true" /> : <MailOpen className="size-4" aria-hidden="true" />}
                        {m.isRead ? 'Mark unread' : 'Mark read'}
                      </IconButton>
                      <IconButton label="Delete message" className="w-auto gap-2 px-3 text-sm hover:border-danger hover:text-danger" onClick={() => void remove(m)}>
                        <Trash2 className="size-4" aria-hidden="true" /> Delete
                      </IconButton>
                      <span className="ml-auto">
                        <Pill tone={email.tone}>{email.text}</Pill>
                      </span>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {list.data && <Pagination page={page} totalPages={list.data.meta.totalPages} onChange={setPage} />}
    </>
  );
}
