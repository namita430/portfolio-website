import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Lock } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { useAuth } from '../auth';
import { Field, Input } from '../components/ui';

export function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not sign in. Please try again.');
      setPassword('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative isolate grid min-h-dvh place-items-center overflow-hidden px-4 py-12">
      <div aria-hidden="true" className="accent-glow absolute inset-x-0 top-0 -z-10 h-96" />
      <div aria-hidden="true" className="bg-grid absolute inset-0 -z-10 opacity-50" />
      <main className="w-full max-w-sm">
        <div className="border-gradient rounded-3xl bg-surface p-7 shadow-2xl sm:p-9">
          <div className="mb-7 text-center">
            <span aria-hidden="true" className="mx-auto grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent">
              <Lock className="size-5" />
            </span>
            <h1 className="mt-4 font-display text-3xl">Admin sign in</h1>
            <p className="mt-1.5 text-sm text-muted">Manage the portfolio&rsquo;s content.</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5" aria-label="Sign in">
            <Field label="Username" htmlFor="login-user">
              <Input id="login-user" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" spellCheck={false} required autoFocus />
            </Field>
            <Field label="Password" htmlFor="login-pass">
              <div className="relative">
                <Input id="login-pass" type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required className="pr-11" />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  aria-label={show ? 'Hide password' : 'Show password'}
                  aria-pressed={show}
                  className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-subtle hover:text-fg"
                >
                  {show ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                </button>
              </div>
            </Field>

            <p role="alert" aria-live="assertive" className="min-h-5 text-sm text-danger">
              {error}
            </p>

            <Button type="submit" size="lg" className="w-full" disabled={busy || !username || !password}>
              {busy ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>
        </div>
        <p className="mt-6 text-center text-sm text-subtle">
          <Link to="/" className="hover:text-accent">
            ← Back to the website
          </Link>
        </p>
      </main>
    </div>
  );
}
