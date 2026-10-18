import { useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * After any change in the dashboard, refetch what is on screen (admin lists AND the public site's data), so
 * the website reflects edits immediately without a manual reload. The session check (/auth/me) is left alone:
 * saving content never changes who is signed in, and re-checking it only adds a chance of a spurious sign-out UI.
 */
export function useRefresh() {
  const qc = useQueryClient();
  return useCallback(
    () => qc.invalidateQueries({ predicate: (query) => !(query.queryKey[0] === 'admin' && query.queryKey[1] === 'me') }),
    [qc],
  );
}

/** Warns before closing the tab with unsaved changes. */
export function useUnsavedWarning(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);
}

/** Returns a new array with the item at `from` moved by `delta` positions (clamped). */
export function moveItem<T>(items: T[], from: number, delta: number): T[] {
  const to = from + delta;
  if (to < 0 || to >= items.length) return items;
  const copy = items.slice();
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item!);
  return copy;
}
