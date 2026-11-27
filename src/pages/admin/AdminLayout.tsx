import { BusFront, ExternalLink, LogOut, ShieldCheck } from 'lucide-react';
import { Link, useRouter } from '../../lib/router';
import { useAuth } from '../../lib/auth';
import { useSite } from '../../lib/site';
import { PageLoader } from '../../components/ui';
import {
  BarChart3,
  CalendarClock,
  LayoutDashboard,
  MessageSquare,
  Percent,
  Route,
  Settings,
  Ticket,
  Users,
} from 'lucide-react';

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: <LayoutDashboard className="size-4" /> },
  { to: '/admin/bookings', label: 'Bookings & payments', icon: <Ticket className="size-4" /> },
  { to: '/admin/fleet', label: 'Operators & buses', icon: <BusFront className="size-4" /> },
  { to: '/admin/routes', label: 'Routes & schedules', icon: <Route className="size-4" /> },
  { to: '/admin/customers', label: 'Customers', icon: <Users className="size-4" /> },
  { to: '/admin/coupons', label: 'Coupons', icon: <Percent className="size-4" /> },
  { to: '/admin/reviews', label: 'Reviews', icon: <MessageSquare className="size-4" /> },
  { to: '/admin/content', label: 'Website content', icon: <Settings className="size-4" /> },
  { to: '/admin/reports', label: 'Reports', icon: <BarChart3 className="size-4" /> },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const { path, navigate } = useRouter();
  const { settings } = useSite();

  if (loading) return <PageLoader label="Checking administrator session…" />;

  if (!user || user.role !== 'admin') {
    return (
      <div className="grid min-h-screen place-items-center bg-mist-50 px-4">
        <div className="card w-full max-w-md p-6 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
            <ShieldCheck className="size-6" />
          </span>
          <h1 className="mt-3 text-lg font-semibold">Administrator sign-in required</h1>
          <p className="mt-1 text-sm text-ink-500">
            {user ? 'This account does not have administrator access.' : 'Sign in with an administrator account to manage the platform.'}
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <Link to="/admin/login" className="btn btn-primary">Go to admin sign-in</Link>
            <Link to="/" className="btn btn-ghost">Back to website</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mist-50">
      <div className="mx-auto flex max-w-[1400px]">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-ink-900 text-slate-300 lg:flex">
          <div className="flex items-center gap-2.5 px-5 py-5">
            <span className="grid size-9 place-items-center rounded-xl bg-brand-600 text-white">
              <BusFront className="size-4" />
            </span>
            <div>
              <p className="font-display text-sm font-semibold text-white">{settings.brandName}</p>
              <p className="text-[10px] uppercase tracking-widest text-slate-500">Admin console</p>
            </div>
          </div>
          <nav className="flex-1 space-y-0.5 px-2">
            {NAV.map((item) => {
              const active = item.to === '/admin' ? path === '/admin' : path.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    active ? 'bg-brand-600 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {item.icon} {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="space-y-1 border-t border-white/10 p-3">
            <Link to="/" className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-400 hover:bg-white/5 hover:text-white">
              <ExternalLink className="size-3.5" /> View website
            </Link>
            <button
              type="button"
              onClick={async () => {
                await logout();
                navigate('/admin/login');
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-400 hover:bg-white/5 hover:text-white"
            >
              <LogOut className="size-3.5" /> Sign out
            </button>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="sticky top-0 z-30 border-b border-mist-200 bg-white/95 backdrop-blur lg:hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="grid size-8 place-items-center rounded-lg bg-brand-600 text-white">
                  <BusFront className="size-4" />
                </span>
                <span className="font-display text-sm font-semibold">{settings.brandName} admin</span>
              </div>
              <Link to="/" className="text-xs font-semibold text-brand-700">View site</Link>
            </div>
            <div className="flex gap-1 overflow-x-auto px-3 pb-2">
              {NAV.map((item) => {
                const active = item.to === '/admin' ? path === '/admin' : path.startsWith(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold ${
                      active ? 'bg-brand-600 text-white' : 'bg-mist-100 text-ink-600'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-mist-200 bg-white px-4 py-2.5">
              <p className="flex items-center gap-2 text-xs font-semibold text-ink-500">
                <CalendarClock className="size-3.5 text-brand-600" />
                {new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
              <p className="hidden text-xs text-ink-500 sm:block">{user.name} · {user.email}</p>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
