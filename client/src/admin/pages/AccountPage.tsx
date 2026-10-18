import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, ShieldCheck } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { useAuth } from '../auth';
import { adminApi } from '../adminApi';
import { useToast } from '../components/Feedback';
import { Card, Field, Input, PageHeader } from '../components/ui';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password.'),
    newPassword: z.string().min(12, 'Use at least 12 characters.').max(128, 'Use at most 128 characters.'),
    confirm: z.string(),
  })
  .refine((v) => v.newPassword === v.confirm, { path: ['confirm'], message: 'The passwords do not match.' })
  .refine((v) => v.newPassword !== v.currentPassword, { path: ['newPassword'], message: 'Choose a password that is different from the current one.' });
type FormValues = z.infer<typeof schema>;

export function AccountPage() {
  const { user } = useAuth();
  const toast = useToast();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { currentPassword: '', newPassword: '', confirm: '' } });

  const onSubmit = handleSubmit(async (v) => {
    try {
      await adminApi.changePassword(v.currentPassword, v.newPassword);
      reset();
      toast.success('Password changed. Any other signed-in devices were signed out.');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setError('currentPassword', { message: 'That is not your current password.' });
      else if (err instanceof ApiError && err.details?.length) setError('newPassword', { message: err.details[0]!.message });
      else toast.fromError(err, 'The password could not be changed.');
    }
  });

  const err = (n: keyof FormValues) => errors[n]?.message;

  return (
    <>
      <PageHeader title="Account" description={`Signed in as ${user?.displayName || user?.username}.`} />
      <Card className="max-w-xl">
        <div className="mb-5 flex items-center gap-3">
          <span aria-hidden="true" className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent">
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <h2 className="font-display text-xl">Change password</h2>
            <p className="text-sm text-muted">Use a long, unique passphrase. Changing it signs out your other devices.</p>
          </div>
        </div>
        <form onSubmit={onSubmit} noValidate className="space-y-5" aria-label="Change password">
          <Field label="Current password" htmlFor="currentPassword" error={err('currentPassword')}>
            <Input id="currentPassword" type="password" autoComplete="current-password" aria-invalid={!!errors.currentPassword} {...register('currentPassword')} />
          </Field>
          <Field label="New password" htmlFor="newPassword" error={err('newPassword')} hint="At least 12 characters. A few random words work well.">
            <Input id="newPassword" type="password" autoComplete="new-password" aria-invalid={!!errors.newPassword} {...register('newPassword')} />
          </Field>
          <Field label="Repeat new password" htmlFor="confirm" error={err('confirm')}>
            <Input id="confirm" type="password" autoComplete="new-password" aria-invalid={!!errors.confirm} {...register('confirm')} />
          </Field>
          <Button type="submit" size="md" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {isSubmitting ? 'Changing…' : 'Change password'}
          </Button>
        </form>
      </Card>
    </>
  );
}
