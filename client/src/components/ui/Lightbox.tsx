import { useCallback, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, X } from 'lucide-react';

export interface LightboxItem {
  kind: 'image' | 'pdf';
  src: string;
  alt: string;
  caption?: string;
  width?: number | null;
  height?: number | null;
}

interface LightboxProps {
  items: LightboxItem[];
  /** Index of the open item, or null when closed. */
  index: number | null;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  label: string;
}

/**
 * Accessible modal built on the native <dialog> element: focus is trapped inside, the rest of the page is
 * inert, Escape closes it, focus returns to the trigger, and ←/→ move between items.
 */
export function Lightbox({ items, index, onClose, onIndexChange, label }: LightboxProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const open = index !== null && items[index] !== undefined;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const go = useCallback(
    (delta: number) => {
      if (index === null || items.length < 2) return;
      onIndexChange((index + delta + items.length) % items.length);
    },
    [index, items.length, onIndexChange],
  );

  const item = open ? items[index!] : undefined;

  return (
    <dialog
      ref={ref}
      className="lightbox"
      aria-label={label}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose(); // click on the backdrop area
      }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') go(1);
        if (e.key === 'ArrowLeft') go(-1);
      }}
    >
      {item && (
        <div className="relative flex h-full w-full flex-col items-center justify-center px-4 py-14 sm:px-16" onClick={(e) => e.target === e.currentTarget && onClose()}>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="absolute right-4 top-4 inline-flex size-11 items-center justify-center rounded-full border border-line-strong bg-surface/80 text-fg transition hover:border-accent hover:text-accent"
          >
            <X className="size-5" aria-hidden="true" />
          </button>

          {items.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="Previous"
                className="absolute left-2 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-line-strong bg-surface/80 text-fg transition hover:border-accent hover:text-accent sm:left-5"
              >
                <ChevronLeft className="size-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label="Next"
                className="absolute right-2 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-line-strong bg-surface/80 text-fg transition hover:border-accent hover:text-accent sm:right-5"
              >
                <ChevronRight className="size-5" aria-hidden="true" />
              </button>
            </>
          )}

          <div className="flex max-h-full w-full max-w-5xl flex-1 items-center justify-center overflow-hidden">
            {item.kind === 'image' ? (
              <img
                key={item.src}
                src={item.src}
                alt={item.alt}
                width={item.width ?? undefined}
                height={item.height ?? undefined}
                className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
              />
            ) : (
              <iframe key={item.src} src={item.src} title={item.alt} className="h-full w-full rounded-lg border border-line bg-white" />
            )}
          </div>

          <div className="mt-4 flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 text-sm text-fg">
            <p className="min-w-0 flex-1 truncate">{item.caption ?? item.alt}</p>
            <div className="flex items-center gap-4 text-muted">
              {items.length > 1 && (
                <span aria-live="polite">
                  {index! + 1} / {items.length}
                </span>
              )}
              <a href={item.src} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-accent">
                Open original <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      )}
    </dialog>
  );
}
