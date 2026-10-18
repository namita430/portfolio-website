import { useId, useRef, useState } from 'react';
import { ExternalLink, FileText, Loader2, Trash2, Upload } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatBytes, isImage } from '@/lib/format';
import { safeHref } from '@/lib/url';
import type { Asset, AssetPurpose } from '@/types/api';
import { adminApi } from '../adminApi';
import { useToast } from './Feedback';

const IMAGE_TYPES = 'image/png,image/jpeg,image/webp';
const IMAGE_MAX = 8 * 1024 * 1024;
const DOC_MAX = 10 * 1024 * 1024;

interface Rule {
  accept: string;
  hint: string;
}
const RULES: Record<AssetPurpose, Rule> = {
  PROJECT_COVER: { accept: IMAGE_TYPES, hint: 'PNG, JPEG or WebP · up to 8 MB' },
  PROJECT_IMAGE: { accept: IMAGE_TYPES, hint: 'PNG, JPEG or WebP · up to 8 MB' },
  PROFILE: { accept: IMAGE_TYPES, hint: 'PNG, JPEG or WebP · up to 8 MB' },
  CERTIFICATE: { accept: `${IMAGE_TYPES},application/pdf`, hint: 'PDF, PNG, JPEG or WebP · up to 10 MB' },
  JOURNEY_DOC: { accept: `${IMAGE_TYPES},application/pdf`, hint: 'PDF, PNG, JPEG or WebP · up to 10 MB' },
  RESUME: { accept: 'application/pdf', hint: 'PDF only · up to 10 MB' },
};

/** Quick client-side check for instant feedback. The server re-validates everything (it is the authority). */
export function preValidate(file: File, purpose: AssetPurpose): string | null {
  const rule = RULES[purpose];
  const allowed = rule.accept.split(',');
  const extOk = /\.(png|jpe?g|webp|pdf)$/i.test(file.name);
  if (!allowed.includes(file.type) || !extOk) return `Unsupported file type. ${rule.hint}.`;
  const limit = file.type === 'application/pdf' ? DOC_MAX : IMAGE_MAX;
  if (file.size > limit) return `That file is ${formatBytes(file.size)}. The limit is ${formatBytes(limit)}.`;
  return null;
}

interface FileUploadProps {
  label: string;
  purpose: AssetPurpose;
  value: Asset | null;
  onChange: (asset: Asset | null) => void;
  description?: string;
}

/** Single-file field: shows a preview, uploads immediately, and lets you replace or remove the file. */
export function FileUpload({ label, purpose, value, onChange, description }: FileUploadProps) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const rule = RULES[purpose];
  const href = safeHref(value?.url);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    const problem = preValidate(file, purpose);
    if (problem) return toast.error(problem);
    setBusy(true);
    try {
      onChange(await adminApi.upload(file, purpose));
    } catch (err) {
      toast.fromError(err, 'The upload failed.');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  return (
    <div>
      <p id={`${id}-label`} className="mb-1.5 text-sm font-medium">
        {label}
      </p>
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-dashed border-line-strong p-3">
        <div className={cn('grid size-20 shrink-0 place-items-center overflow-hidden rounded-lg bg-surface-2 text-subtle', !value && 'border border-line')}>
          {value && isImage(value.mimeType) ? (
            <img src={value.url} alt="" className="size-full object-cover" />
          ) : value ? (
            <FileText className="size-8 text-accent" aria-hidden="true" />
          ) : (
            <Upload className="size-6" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          {value ? (
            <>
              <p className="truncate text-sm font-medium">{value.originalName}</p>
              <p className="text-xs text-subtle">
                {value.mimeType.split('/')[1]?.toUpperCase()} · {formatBytes(value.sizeBytes)}
                {value.width && value.height ? ` · ${value.width}×${value.height}` : ''}
              </p>
              {href && (
                <a href={href} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-accent hover:underline">
                  Open file <ExternalLink className="size-3" aria-hidden="true" />
                </a>
              )}
            </>
          ) : (
            <p className="text-sm text-muted">{description ?? 'No file selected.'}</p>
          )}
          <p className="mt-1 text-xs text-subtle">{rule.hint}</p>
        </div>
        <div className="flex gap-2">
          <input
            ref={input}
            id={id}
            type="file"
            accept={rule.accept}
            className="sr-only"
            aria-labelledby={`${id}-label`}
            onChange={(e) => void handleFile(e.target.files?.[0])}
          />
          <label
            htmlFor={id}
            className={cn(
              'inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border border-line-strong px-4 text-sm transition hover:border-accent hover:text-accent focus-within:outline-2',
              busy && 'pointer-events-none opacity-60',
            )}
          >
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Upload className="size-4" aria-hidden="true" />}
            {busy ? 'Uploading…' : value ? 'Replace' : 'Upload'}
          </label>
          {value && !busy && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="inline-flex h-9 items-center gap-2 rounded-full border border-line-strong px-4 text-sm text-muted transition hover:border-danger hover:text-danger"
            >
              <Trash2 className="size-4" aria-hidden="true" /> Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
