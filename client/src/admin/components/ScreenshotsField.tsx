import { useId, useRef, useState } from 'react';
import { type Control, type UseFormRegister, useFieldArray } from 'react-hook-form';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import type { Asset } from '@/types/api';
import { adminApi } from '../adminApi';
import { preValidate } from './FileUpload';
import { useToast } from './Feedback';
import { MoveButtons } from './RowControls';
import { IconButton, Input } from './ui';

export interface ScreenshotValue {
  asset: Asset;
  altText: string;
}

interface Props {
  // The form owning this field must have a `screenshots: ScreenshotValue[]` entry.
  control: Control<any>;
  register: UseFormRegister<any>;
}

/** Ordered list of project screenshots: upload several at once, describe each one, reorder or remove. */
export function ScreenshotsField({ control, register }: Props) {
  const id = useId();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const { fields, append, remove, move } = useFieldArray({ control, name: 'screenshots' });

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        const problem = preValidate(file, 'PROJECT_IMAGE');
        if (problem) {
          toast.error(`${file.name}: ${problem}`);
          continue;
        }
        try {
          const asset = await adminApi.upload(file, 'PROJECT_IMAGE');
          append({ asset, altText: '' });
        } catch (err) {
          toast.fromError(err, `${file.name} could not be uploaded.`);
        }
      }
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <p className="text-sm font-medium" id={`${id}-label`}>
          Screenshots
        </p>
        <div>
          <input ref={input} id={id} type="file" multiple accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => void addFiles(e.target.files)} />
          <label htmlFor={id} className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border border-line-strong px-4 text-sm transition hover:border-accent hover:text-accent focus-within:outline-2">
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <ImagePlus className="size-4" aria-hidden="true" />}
            {busy ? 'Uploading…' : 'Add images'}
          </label>
        </div>
      </div>
      <p className="mb-3 text-xs text-subtle">Only add real screenshots of the project. PNG, JPEG or WebP · up to 8 MB each. The first image is shown first in the gallery.</p>

      {fields.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line-strong p-5 text-center text-sm text-muted">No screenshots yet.</p>
      ) : (
        <ul className="space-y-3">
          {fields.map((field, i) => {
            const asset = (field as unknown as ScreenshotValue).asset;
            return (
              <li key={field.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line p-3">
                <img src={asset.url} alt="" className="size-16 shrink-0 rounded-lg object-cover" />
                <div className="min-w-0 flex-1 basis-48">
                  <label htmlFor={`${id}-alt-${i}`} className="mb-1 block text-xs text-subtle">
                    Description (alt text) — {asset.originalName}
                  </label>
                  <Input id={`${id}-alt-${i}`} placeholder="What does this screenshot show?" maxLength={200} {...register(`screenshots.${i}.altText`)} />
                </div>
                <MoveButtons name={`screenshot ${i + 1}`} index={i} count={fields.length} onMove={(d) => move(i, i + d)} />
                <IconButton label={`Remove screenshot ${i + 1}`} className="hover:border-danger hover:text-danger" onClick={() => remove(i)}>
                  <Trash2 className="size-4" aria-hidden="true" />
                </IconButton>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
