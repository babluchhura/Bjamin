import { useEffect, useState } from 'react';
import { Ban, BusFront, CalendarDays, Clock, IndianRupee, Route, Ticket, TrendingUp, Users } from 'lucide-react';
import { AdminHeader, StatCard, TableShell } from './parts';
import { PageLoader, StatusBadge } from '../../components/ui';
import { api, type AdminStats } from '../../lib/api';
import { formatDate, formatINR } from '../../lib/format';
import { Link } from '../../lib/router';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.admin
      .stats()
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader label="Loading dashboard…" />;
  if (!stats) return <p className="text-sm text-rose-600">Could not load dashboard metrics.</p>;

  return (
    <div>
      <AdminHeader
        title="Dashboard"
        subtitle="Live snapshot of bookings, revenue and inventory."
        action={<Link to="/admin/bookings" className="btn btn-primary">Manage bookings</Link>}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total bookings" value={stats.totalBookings} icon={<Ticket className="size-4" />} hint={`${stats.confirmedBookings} confirmed`} />
        <StatCard label="Revenue collected" value={formatINR(stats.revenue)} icon={<IndianRupee className="size-4" />} tone="emerald" hint={`${formatINR(stats.refunded)} refunded`} />
        <StatCard label="Today's bookings" value={stats.todayBookings} icon={<CalendarDays className="size-4" />} tone="brand" />
        <StatCard label="Pending payments" value={stats.pendingBookings} icon={<Clock className="size-4" />} tone="amber" />
        <StatCard label="Customers" value={stats.totalCustomers} icon={<Users className="size-4" />} tone="slate" />
        <StatCard label="Buses" value={stats.totalBuses} icon={<BusFront className="size-4" />} tone="brand" />
        <StatCard label="Routes" value={stats.totalRoutes} icon={<Route className="size-4" />} tone="brand" />
        <StatCard label="Cancelled" value={stats.cancelledBookings} icon={<Ban className="size-4" />} tone="rose" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold text-ink-900">Recent bookings</h2>
            <Link to="/admin/bookings" className="text-xs font-semibold text-brand-700">View all</Link>
          </div>
          <TableShell head={['Booking', 'Passenger', 'Route', 'Amount', 'Status']}>
            {stats.recentBookings.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-sm text-ink-500">No bookings yet.</td></tr>
            ) : (
              stats.recentBookings.map((b) => (
                <tr key={b.code}>
                  <td className="px-4 py-2.5">
                    <Link to={`/bookings/${b.code}`} className="font-semibold text-brand-700">{b.code}</Link>
                    <p className="text-[11px] text-ink-300">{formatDate(b.createdAt)}</p>
                  </td>
                  <td className="px-4 py-2.5">{b.contactName}</td>
                  <td className="px-4 py-2.5 text-ink-500">{b.routeLabel}</td>
                  <td className="px-4 py-2.5 font-semibold">{formatINR(b.totalAmount)}</td>
                  <td className="px-4 py-2.5"><StatusBadge status={b.status} /></td>
                </tr>
              ))
            )}
          </TableShell>
        </div>

        <div className="card p-4">
          <h2 className="flex items-center gap-2 text-sm font-bold"><TrendingUp className="size-4 text-brand-600" /> Quick actions</h2>
          <div className="mt-3 grid gap-2">
            {[
              { to: '/admin/routes', label: 'Add a new departure' },
              { to: '/admin/fleet', label: 'Add a bus or operator' },
              { to: '/admin/coupons', label: 'Create a coupon' },
              { to: '/admin/content', label: 'Update website content' },
              { to: '/admin/reports', label: 'Generate revenue report' },
            ].map((action) => (
              <Link key={action.to} to={action.to} className="rounded-lg border border-mist-200 px-3 py-2 text-sm font-semibold text-ink-700 transition hover:border-brand-300 hover:text-brand-700">
                {action.label}
              </Link>
            ))}
          </div>
          <div className="mt-4 rounded-lg bg-mist-50 p-3 text-[11px] leading-relaxed text-ink-500">
            Seats held during checkout are released automatically when a hold expires, so inventory stays accurate without manual cleanup.
          </div>
        </div>
      </div>
    </div>
  );
}
