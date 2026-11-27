import { useState } from 'react';
import { ArrowRight, BusFront, Eye, EyeOff, Lock, Mail, ShieldCheck, UserRound } from 'lucide-react';
import { Field } from '../components/ui';
import { useAuth } from '../lib/auth';
import { useI18n } from '../lib/i18n';
import { useToast } from '../lib/toast';
import { Link, useQuery, useRouter } from '../lib/router';

export default function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const { login, register } = useAuth();
  const { navigate } = useRouter();
  const query = useQuery();
  const { t } = useI18n();
  const toast = useToast();
  const next = query.get('next') || '';

  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const user = mode === 'login'
        ? await login(form.email.trim(), form.password)
        : await register({ name: form.name.trim(), email: form.email.trim(), phone: form.phone, password: form.password });
      toast.push(mode === 'login' ? `Welcome back, ${user.name.split(' ')[0]}` : 'Account created. Happy journeys!', 'success');
      if (next) navigate(next);
      else if (user.role === 'admin') navigate('/admin');
      else navigate('/bookings');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-shell py-12">
      <div className="mx-auto grid max-w-4xl overflow-hidden rounded-2xl border border-mist-200 bg-white shadow-xl shadow-slate-900/5 lg:grid-cols-2">
        <div className="hidden flex-col justify-between bg-gradient-to-br from-ink-900 via-brand-900 to-brand-700 p-8 text-white lg:flex">
          <div>
            <span className="grid size-11 place-items-center rounded-xl bg-white/10">
              <BusFront className="size-5" />
            </span>
            <h2 className="mt-6 font-display text-2xl font-semibold">
              {mode === 'login' ? 'Your journeys, in one place' : 'Join Utkal Yatra'}
            </h2>
            <p className="mt-2 text-sm text-brand-100/90">
              Save your passenger details, download e-tickets any time and cancel with a clear refund estimate.
            </p>
          </div>
          <ul className="space-y-3 text-sm text-brand-100/80">
            <li className="flex items-center gap-2"><ShieldCheck className="size-4 text-brand-300" /> Secure sessions, never stored in the browser</li>
            <li className="flex items-center gap-2"><Mail className="size-4 text-brand-300" /> Tickets emailed instantly after payment</li>
            <li className="flex items-center gap-2"><Lock className="size-4 text-brand-300" /> Payments verified on our server</li>
          </ul>
        </div>

        <div className="p-6 sm:p-8">
          <h1 className="font-display text-xl font-semibold text-ink-900">
            {mode === 'login' ? t('auth.loginTitle') : t('auth.registerTitle')}
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            {mode === 'login' ? 'Sign in with the email you booked with.' : 'It takes less than a minute.'}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-3">
            {mode === 'register' ? (
              <Field label={t('common.name')}>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="field" autoComplete="name" required />
              </Field>
            ) : null}
            <Field label={t('common.email')}>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="field" autoComplete="email" required />
            </Field>
            {mode === 'register' ? (
              <Field label={t('common.phone')}>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} className="field" inputMode="numeric" required />
              </Field>
            ) : null}
            <Field label={t('common.password')} hint={mode === 'register' ? 'At least 8 characters.' : undefined}>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="field pr-10"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-ink-300 hover:text-ink-700"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </Field>

            {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{error}</p> : null}

            <button type="submit" disabled={busy} className="btn btn-primary w-full">
              {busy ? t('common.loading') : mode === 'login' ? t('auth.signIn') : t('auth.createAccount')}
              <ArrowRight className="size-4" />
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-ink-500">
            {mode === 'login' ? t('auth.noAccount') : t('auth.haveAccount')}{' '}
            <Link
              to={`${mode === 'login' ? '/register' : '/login'}${next ? `?next=${encodeURIComponent(next)}` : ''}`}
              className="link"
            >
              {mode === 'login' ? t('auth.createAccount') : t('auth.signIn')}
            </Link>
          </p>

          <p className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-ink-300">
            <UserRound className="size-3" /> Admin users can sign in here and open the admin panel.
          </p>
        </div>
      </div>
    </div>
  );
}
