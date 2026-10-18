import { useId, useState, type KeyboardEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { adminApi } from '../adminApi';
import { inputClass } from './ui';

interface TagInputProps {
  id: string;
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

/** Chips input: Enter or comma adds, Backspace on an empty box removes the last. Suggests existing tags. */
export function TagInput({ id, value, onChange, placeholder = 'Type a name and press Enter' }: TagInputProps) {
  const listId = useId();
  const [draft, setDraft] = useState('');
  const suggestions = useQuery({ queryKey: ['admin', 'tags'], queryFn: adminApi.tags, staleTime: 60_000 });

  const add = (raw: string) => {
    const name = raw.trim().replace(/\s+/g, ' ');
    if (!name) return;
    if (!value.some((t) => t.toLowerCase() === name.toLowerCase())) onChange([...value, name]);
    setDraft('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add(draft);
    } else if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div>
      {value.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-1.5" aria-label="Selected tags">
          {value.map((tag) => (
            <li key={tag} className="inline-flex items-center gap-1 rounded-md border border-line-strong bg-surface-2 py-0.5 pl-2.5 pr-1 font-mono text-xs">
              {tag}
              <button type="button" aria-label={`Remove ${tag}`} onClick={() => onChange(value.filter((t) => t !== tag))} className="grid size-5 place-items-center rounded text-subtle hover:text-danger">
                <X className="size-3" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <input
        id={id}
        className={inputClass}
        value={draft}
        list={listId}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => add(draft)}
      />
      <datalist id={listId}>
        {(suggestions.data ?? [])
          .filter((s) => !value.includes(s))
          .map((s) => (
            <option key={s} value={s} />
          ))}
      </datalist>
    </div>
  );
}
