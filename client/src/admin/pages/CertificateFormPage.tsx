import { Link, useNavigate, useParams } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { isImage } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { ErrorState, Skeleton } from '@/components/ui/States';
import type { Asset, CertificateAdmin } from '@/types/api';
import { adminApi, type CertificatePayload } from '../adminApi';
import { useConfirm, useToast } from '../components/Feedback';
import { FileUpload } from '../components/FileUpload';
import { Card, Field, Input, PageHeader, SectionTitle, Switch, Textarea } from '../components/ui';
import { useRefresh, useUnsavedWarning } from '../hooks';

const optionalUrl = z
  .string()
  .trim()
  .refine((v) => {
    if (v === '') return true;
    try {
      const u = new URL(v);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  }, 'Enter a full link starting with http:// or https://');

const schema = z
  .object({
    title: z.string().trim().min(1, 'Title is required.').max(200),
    issuer: z.string().trim().min(1, 'Issuing organisation is required.').max(160),
    category: z.string().trim().min(1, 'Category is required.').max(80),
    issueDate: z.string(),
    credentialId: z.string().trim().max(120),
    verificationUrl: optionalUrl,
    description: z.string().trim().max(3000),
    file: z.custom<Asset | null>(),
    thumbnail: z.custom<Asset | null>(),
    isFeatured: z.boolean(),
    isPublished: z.boolean(),
  })
  .refine((v) => !v.isPublished || !!v.file || v.verificationUrl !== '', {
    path: ['isPublished'],
    message: 'Upload the certificate file or add a verification URL before publishing it.',
  });
type FormValues = z.infer<typeof schema>;

const empty: FormValues = { title: '', issuer: '', category: '', issueDate: '', credentialId: '', verificationUrl: '', description: '', file: null, thumbnail: null, isFeatured: false, isPublished: false };

const toForm = (c: CertificateAdmin): FormValues => ({
  title: c.title,
  issuer: c.issuer,
  category: c.category,
  issueDate: c.issueDate ?? '',
  credentialId: c.credentialId ?? '',
  verificationUrl: c.verificationUrl ?? '',
  description: c.description ?? '',
  file: c.file,
  thumbnail: c.thumbnail,
  isFeatured: c.isFeatured,
  isPublished: c.isPublished,
});

const toPayload = (v: FormValues): CertificatePayload => ({
  title: v.title,
  issuer: v.issuer,
  category: v.category,
  issueDate: v.issueDate || null,
  credentialId: v.credentialId || null,
  verificationUrl: v.verificationUrl || null,
  description: v.description || null,
  fileId: v.file?.id ?? null,
  thumbnailId: v.thumbnail?.id ?? null,
  isFeatured: v.isFeatured,
  isPublished: v.isPublished,
});

export function CertificateFormPage() {
  const { id } = useParams();
  const certId = id ? Number(id) : null;
  const query = useQuery({ queryKey: ['admin', 'certificate', certId], queryFn: () => adminApi.certificate(certId!), enabled: certId !== null });
  if (certId !== null && query.isPending) return <Skeleton className="h-96" />;
  if (certId !== null && query.isError) return <ErrorState title="Could not load this certificate" error={query.error} onRetry={() => void query.refetch()} />;
  return <CertificateForm key={certId ?? 'new'} cert={query.data ?? null} />;
}

function CertificateForm({ cert }: { cert: CertificateAdmin | null }) {
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const refresh = useRefresh();

  const categories = useQuery({ queryKey: ['admin', 'certificates', 'categories'], queryFn: () => adminApi.certificates({ pageSize: 100 }) });
  const known = [...new Set((categories.data?.data ?? []).map((c) => c.category))];

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: cert ? toForm(cert) : empty });
  const { register, control, handleSubmit, setError, watch, formState } = form;
  const { errors, isSubmitting, isDirty } = formState;
  useUnsavedWarning(isDirty && !isSubmitting);

  const file = watch('file');
  const isPdf = !!file && !isImage(file.mimeType);

  const onSubmit = handleSubmit(async (values) => {
    try {
      const payload = toPayload(values);
      const saved = cert ? await adminApi.updateCertificate(cert.id, payload) : await adminApi.createCertificate(payload);
      await refresh();
      toast.success(cert ? 'Certificate saved.' : 'Certificate created.');
      if (!cert) navigate(`/admin/certificates/${saved.id}`, { replace: true });
      else form.reset(toForm(saved));
    } catch (err) {
      if (err instanceof ApiError && err.details) for (const d of err.details) if (d.path in empty) setError(d.path as keyof FormValues, { message: d.message });
      toast.fromError(err, 'The certificate could not be saved.');
    }
  });

  async function remove() {
    if (!cert) return;
    if (!(await confirm({ title: 'Delete this certificate?', message: 'It and its uploaded file will be removed. This cannot be undone.', confirmLabel: 'Delete certificate', danger: true }))) return;
    try {
      await adminApi.deleteCertificate(cert.id);
      await refresh();
      toast.success('Certificate deleted.');
      navigate('/admin/certificates', { replace: true });
    } catch (err) {
      toast.fromError(err);
    }
  }

  const err = (n: keyof FormValues) => (errors[n] as { message?: string } | undefined)?.message;
  const aria = (n: keyof FormValues) => ({ 'aria-invalid': !!errors[n], 'aria-describedby': errors[n] ? `${n}-err` : undefined });

  return (
    <form onSubmit={onSubmit} noValidate aria-label={cert ? 'Edit certificate' : 'New certificate'}>
      <Link to="/admin/certificates" className="mb-4 inline-flex items-center gap-2 text-sm text-muted hover:text-accent">
        <ArrowLeft className="size-4" aria-hidden="true" /> All certificates
      </Link>
      <PageHeader
        title={cert ? 'Edit certificate' : 'New certificate'}
        description="Only add credentials you have actually earned, and attach the document or a verification link."
        actions={
          <Button type="submit" size="md" disabled={isSubmitting || (!!cert && !isDirty)}>
            {isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {isSubmitting ? 'Saving…' : cert ? 'Save changes' : 'Create certificate'}
          </Button>
        }
      />

      <div className="space-y-6">
        <Card>
          <SectionTitle>Details</SectionTitle>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Title" htmlFor="title" error={err('title')} required className="sm:col-span-2">
              <Input id="title" {...register('title')} {...aria('title')} />
            </Field>
            <Field label="Issuing organisation" htmlFor="issuer" error={err('issuer')} required>
              <Input id="issuer" {...register('issuer')} {...aria('issuer')} />
            </Field>
            <Field label="Category" htmlFor="category" error={err('category')} required hint="Used for the filter buttons on the website.">
              <Input id="category" list="cert-categories" {...register('category')} {...aria('category')} />
              <datalist id="cert-categories">
                {known.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
            <Field label="Issue date" htmlFor="issueDate" error={err('issueDate')} hint="Leave empty if you are not sure — do not guess.">
              <Input id="issueDate" type="date" {...register('issueDate')} />
            </Field>
            <Field label="Credential ID" htmlFor="credentialId" error={err('credentialId')} hint="Optional.">
              <Input id="credentialId" {...register('credentialId')} />
            </Field>
            <Field label="Verification URL" htmlFor="verificationUrl" error={err('verificationUrl')} hint="Optional link where anyone can verify this credential." className="sm:col-span-2">
              <Input id="verificationUrl" type="url" inputMode="url" placeholder="https://…" {...register('verificationUrl')} {...aria('verificationUrl')} />
            </Field>
            <Field label="Description" htmlFor="description" error={err('description')} hint="Optional: what the programme covered." className="sm:col-span-2">
              <Textarea id="description" rows={4} {...register('description')} />
            </Field>
          </div>
        </Card>

        <Card>
          <SectionTitle>Files</SectionTitle>
          <div className="space-y-6">
            <Controller control={control} name="file" render={({ field }) => <FileUpload label="Certificate file" purpose="CERTIFICATE" value={field.value} onChange={field.onChange} description="Upload the certificate as a PDF or an image." />} />
            {isPdf && (
              <Controller control={control} name="thumbnail" render={({ field }) => <FileUpload label="Preview image (optional)" purpose="CERTIFICATE" value={field.value} onChange={field.onChange} description="PDFs have no thumbnail. Upload a screenshot of the certificate to show on the card." />} />
            )}
          </div>
        </Card>

        <Card>
          <SectionTitle>Publishing</SectionTitle>
          <div className="space-y-5">
            <div>
              <Controller control={control} name="isPublished" render={({ field }) => <Switch id="isPublished" label="Published" description="Visible on the website. Requires a file or a verification URL." checked={field.value} onChange={field.onChange} />} />
              {err('isPublished') && (
                <p id="isPublished-err" role="alert" className="mt-2 text-sm text-danger">
                  {err('isPublished')}
                </p>
              )}
            </div>
            <Controller control={control} name="isFeatured" render={({ field }) => <Switch id="isFeatured" label="Featured" checked={field.value} onChange={field.onChange} />} />
          </div>
        </Card>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
        {cert ? (
          <Button variant="danger" size="md" onClick={() => void remove()}>
            <Trash2 className="size-4" aria-hidden="true" /> Delete certificate
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" size="lg" disabled={isSubmitting || (!!cert && !isDirty)}>
          {isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {isSubmitting ? 'Saving…' : cert ? 'Save changes' : 'Create certificate'}
        </Button>
      </div>
    </form>
  );
}
