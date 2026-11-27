import { useEffect, useState } from 'react';
import { BusFront, ChevronDown, Globe2, LogOut, Menu, Phone, ShieldCheck, Ticket, User, X } from 'lucide-react';
import { Link, useRouter } from '../lib/router';
import { useAuth } from '../lib/auth';
import { useI18n, LANGUAGES } from '../lib/i18n';
import { useSite } from '../lib/site';

export default function Header() {
  const { path, navigate } = useRouter();
  const { user, logout } = useAuth();
  const { t, lang, setLang } = useI18n();
  const { settings } = useSite();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
    setAccountOpen(false);
  }, [path]);

  const links = [
    { to: '/', label: t('nav.home') },
    { to: '/search', label: t('nav.search') },
    { to: '/bookings', label: t('nav.bookings') },
    { to: '/about', label: t('nav.about') },
    { to: '/faq', label: t('nav.faq') },
    { to: '/contact', label: t('nav.contact') },
  ];

  const isActive = (to: string) => (to === '/' ? path === '/' : path.startsWith(to));

  return (
    <header className="sticky top-0 z-50 border-b border-mist-200 bg-white/95 backdrop-blur">
      <div className="hidden border-b border-mist-100 bg-mist-50/80 lg:block">
        <div className="page-shell flex items-center justify-between py-1.5 text-[12px] text-ink-500">
          <p>{settings.tagline}</p>
          <div className="flex items-center gap-5">
            <a href={`tel:${settings.supportPhone?.replace(/\s/g, '')}`} className="inline-flex items-center gap-1.5 hover:text-brand-700">
              <Phone className="size-3.5" /> {settings.supportPhone}
            </a>
            <span className="inline-flex items-center gap-1.5">
              <Globe2 className="size-3.5" />
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value as typeof lang)}
                aria-label="Language"
                className="cursor-pointer bg-transparent text-[12px] font-semibold text-ink-700 focus:outline-none"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </span>
          </div>
        </div>
      </div>

      <div className="page-shell flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2.5" aria-label={settings.brandName}>
          <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg shadow-brand-600/25">
            <BusFront className="size-5" />
          </span>
          <span className="leading-tight">
            <span className="block font-display text-lg font-semibold tracking-tight text-ink-900">{settings.brandName}</span>
            <span className="hidden text-[10.5px] font-semibold uppercase tracking-[0.14em] text-brand-600 sm:block">
              Odisha bus booking
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                isActive(link.to) ? 'bg-brand-50 text-brand-700' : 'text-ink-700 hover:bg-mist-100 hover:text-ink-900'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {user?.role === 'admin' ? (
            <Link to="/admin" className="hidden items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-bold text-brand-700 sm:inline-flex">
              <ShieldCheck className="size-3.5" /> Admin
            </Link>
          ) : null}

          {user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setAccountOpen((v) => !v)}
                className="flex items-center gap-2 rounded-xl border border-mist-200 bg-white px-2.5 py-2 text-sm font-semibold text-ink-700 hover:border-brand-300"
              >
                <span className="grid size-6 place-items-center rounded-full bg-brand-600 text-[11px] font-bold text-white">
                  {user.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="hidden max-w-[110px] truncate sm:block">{user.name.split(' ')[0]}</span>
                <ChevronDown className="size-3.5" />
              </button>
              {accountOpen ? (
                <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-mist-200 bg-white shadow-xl">
                  <div className="border-b border-mist-100 px-4 py-3">
                    <p className="truncate text-sm font-semibold">{user.name}</p>
                    <p className="truncate text-xs text-ink-500">{user.email}</p>
                  </div>
                  <Link to="/account" className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-mist-50">
                    <User className="size-4 text-ink-500" /> {t('nav.account')}
                  </Link>
                  <Link to="/bookings" className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-mist-50">
                    <Ticket className="size-4 text-ink-500" /> {t('nav.bookings')}
                  </Link>
                  {user.role === 'admin' ? (
                    <Link to="/admin" className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-mist-50">
                      <ShieldCheck className="size-4 text-ink-500" /> {t('nav.admin')}
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    onClick={async () => {
                      await logout();
                      navigate('/');
                    }}
                    className="flex w-full items-center gap-2 border-t border-mist-100 px-4 py-2.5 text-left text-sm text-rose-600 hover:bg-rose-50"
                  >
                    <LogOut className="size-4" /> {t('nav.logout')}
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <Link to="/login" className="btn btn-primary hidden sm:inline-flex">
              {t('nav.login')}
            </Link>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="grid size-10 place-items-center rounded-xl border border-mist-200 text-ink-700 lg:hidden"
            aria-label="Toggle navigation"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="border-t border-mist-200 bg-white lg:hidden">
          <div className="page-shell flex flex-col gap-1 py-3">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`rounded-lg px-3 py-2.5 text-sm font-semibold ${
                  isActive(link.to) ? 'bg-brand-50 text-brand-700' : 'text-ink-700'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 flex items-center gap-2 border-t border-mist-100 pt-3">
              {!user ? (
                <Link to="/login" className="btn btn-primary flex-1">
                  {t('nav.login')}
                </Link>
              ) : null}
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value as typeof lang)}
                aria-label="Language"
                className="field w-auto"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
