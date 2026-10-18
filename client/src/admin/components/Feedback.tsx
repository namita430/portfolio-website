import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, X, XCircle } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';

// ------------------------------------------------------------------ toasts
type ToastKind = 'success' | 'error';
interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}
interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  /** Shows a friendly message for any thrown error. */
  fromError: (err: unknown, fallback?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);
export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <FeedbackProvider>');
  return ctx;
};

export function errorMessage(err: unknown, fallback = 'Something went wrong.') {
  if (err instanceof ApiError) {
    const detail = err.details?.map((d) => d.message).filter(Boolean)[0];
    return detail && err.code === 'VALIDATION_ERROR' ? `${err.message} ${detail}` : err.message;
  }
  return err instanceof Error ? err.message : fallback;
}

// ------------------------------------------------------------------ confirm dialog
interface ConfirmOptions {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
}
type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;
const ConfirmContext = createContext<ConfirmFn | null>(null);
export const useConfirm = () => {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used inside <FeedbackProvider>');
  return ctx;
};

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = nextId.current++;
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 8000 : 4000);
  }, []);

  const toastApi = useRef<ToastApi>({
    success: (m) => push('success', m),
    error: (m) => push('error', m),
    fromError: (err, fallback) => push('error', errorMessage(err, fallback)),
  }).current;

  // confirm dialog state
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pending, setPending] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => new Promise<boolean>((resolve) => setPending({ ...options, resolve })), []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (pending && !dialog.open) dialog.showModal();
    if (!pending && dialog.open) dialog.close();
  }, [pending]);

  const settle = (value: boolean) => {
    pending?.resolve(value);
    setPending(null);
  };

  return (
    <ToastContext.Provider value={toastApi}>
      <ConfirmContext.Provider value={confirm}>
        {children}

        <dialog
          ref={dialogRef}
          aria-labelledby="confirm-title"
          aria-describedby="confirm-message"
          onCancel={(e) => {
            e.preventDefault();
            settle(false);
          }}
          className="m-auto w-[min(28rem,92vw)] rounded-2xl border border-line-strong bg-surface p-0 text-fg backdrop:bg-black/70 backdrop:backdrop-blur-sm"
        >
          {pending && (
            <div className="p-6">
              <div className="flex gap-4">
                <span aria-hidden="true" className={cn('grid size-10 shrink-0 place-items-center rounded-full', pending.danger ? 'bg-danger/15 text-danger' : 'bg-accent-soft text-accent')}>
                  <AlertTriangle className="size-5" />
                </span>
                <div>
                  <h2 id="confirm-title" className="font-display text-xl">
                    {pending.title}
                  </h2>
                  <div id="confirm-message" className="mt-2 text-sm text-muted">
                    {pending.message}
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <Button variant="ghost" size="sm" onClick={() => settle(false)} autoFocus>
                  Cancel
                </Button>
                <Button variant={pending.danger ? 'danger' : 'primary'} size="sm" onClick={() => settle(true)}>
                  {pending.confirmLabel ?? 'Confirm'}
                </Button>
              </div>
            </div>
          )}
        </dialog>

        <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:items-end sm:pr-6">
          {toasts.map((t) => (
            <div
              key={t.id}
              role={t.kind === 'error' ? 'alert' : 'status'}
              className={cn(
                'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-surface px-4 py-3 text-sm shadow-2xl',
                t.kind === 'error' ? 'border-danger/50' : 'border-success/50',
              )}
            >
              {t.kind === 'error' ? <XCircle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />}
              <p className="flex-1">{t.message}</p>
              <button type="button" aria-label="Dismiss notification" onClick={() => setToasts((all) => all.filter((x) => x.id !== t.id))} className="text-subtle hover:text-fg">
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      </ConfirmContext.Provider>
    </ToastContext.Provider>
  );
}
