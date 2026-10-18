import { ArrowDown, ArrowUp } from 'lucide-react';
import { IconButton } from './ui';

/** Accessible reordering without drag-and-drop: works with keyboard and screen readers. */
export function MoveButtons({ index, count, onMove, disabled, name }: { index: number; count: number; onMove: (delta: -1 | 1) => void; disabled?: boolean; name: string }) {
  return (
    <div className="flex gap-1">
      <IconButton label={`Move ${name} up`} disabled={disabled || index === 0} onClick={() => onMove(-1)}>
        <ArrowUp className="size-4" aria-hidden="true" />
      </IconButton>
      <IconButton label={`Move ${name} down`} disabled={disabled || index === count - 1} onClick={() => onMove(1)}>
        <ArrowDown className="size-4" aria-hidden="true" />
      </IconButton>
    </div>
  );
}
