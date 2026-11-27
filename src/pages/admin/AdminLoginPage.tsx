import { useState } from 'react';
import { ArrowRight, BusFront, Lock, ShieldCheck } from 'lucide-react';
import { Field } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { useRouter, Link } from '../../lib/router';
import { useToast } from '../../lib/toast';

export default function AdminLoginPage() {
  const { login, user } = useAuth();
  const { navigate } = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const current = await login(email.trim(), password);
      if (current.role !== 'admin') {
        setError('This account does not have administrator access.');
        return;
      }
      toast.push('Signed in to the admin console.', 'success');
      navigate('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-ink-900 via-brand-900 to-brand-700 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-white/15 bg-white p-6 shadow-2xl">
        <div className="flex items-center gap-2.5">
          <span className="grid size-10 place-items-center rounded-xl bg-brand-600 text-white">
            <BusFront className="size-5" />
          </span>
          <div>
            <p className="font-display text-lg font-semibold text-ink-900">Utkal Yatra admin</p>
            <p className="text-[11px] uppercase tracking-widest text-ink-300">Secure console</p>
          </div>
        </div>

        <h1 className="mt-5 text-base font-semibold">Administrator sign-in</h1>
        <p className="mt-1 text-sm text-ink-500">Manage buses, schedules, bookings and refunds.</p>

        {user?.role === 'admin' ? (
          <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
            You are already signed in as {user.email}. <Link to="/admin" className="underline">Open dashboard</Link>
          </div>
        ) : null}

        <form onSubmit={submit} className="mt-4 space-y-3">
          <Field label="Admin email">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field" autoComplete="username" required />
          </Field>
          <Field label="Password">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="field" autoComplete="current-password" required />
          </Field>
          {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{error}</p> : null}
          <button type="submit" disabled={busy} className="btn btn-primary w-full">
            {busy ? 'Signing in…' : 'Sign in'} <ArrowRight className="size-4" />
          </button>
        </form>

        <div className="mt-4 flex items-start gap-2 rounded-lg bg-mist-50 px-3 py-2.5 text-[11px] leading-relaxed text-ink-500">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
          Admin sessions are signed server-side and expire automatically. Access is limited to accounts with the administrator role.
        </div>

        <p className="mt-4 flex items-center justify-center gap-1 text-[11px] text-ink-300">
          <Lock className="size-3" /> <Link to="/" className="hover:text-brand-700">Back to the website</Link>
        </p>
      </div>
    </div>
  );
}
