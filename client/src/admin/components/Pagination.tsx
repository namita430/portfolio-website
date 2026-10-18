import { ChevronLeft, ChevronRight } from 'lucide-react';
import { IconButton } from './ui';

export function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="mt-6 flex items-center justify-center gap-3 text-sm text-muted">
      <IconButton label="Previous page" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        <ChevronLeft className="size-4" aria-hidden="true" />
      </IconButton>
      <span aria-live="polite">
        Page {page} of {totalPages}
      </span>
      <IconButton label="Next page" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        <ChevronRight className="size-4" aria-hidden="true" />
      </IconButton>
    </nav>
  );
}
