import { useEffect, useState } from 'react';
import { Download, TrendingUp } from 'lucide-react';
import { AdminHeader, StatCard, TableShell } from './parts';
import { PageLoader } from '../../components/ui';
import { api } from '../../lib/api';
import { formatDate, formatINR } from '../../lib/format';
import { useToast } from '../../lib/toast';

type Report = {
  daily: Array<{ day: string; bookings: number; revenue: number }>;
  topRoutes: Array<{ routeLabel: string; bookings: number; revenue: number }>;
};

export default function AdminReportsPage() {
  const toast = useToast();
  const [days, setDays] = useState(30);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.admin
      .reports(days)
      .then(setReport)
      .catch((error) => toast.push(error instanceof Error ? error.message : 'Could not load reports.', 'error'))
      .finally(() => setLoading(false));
  }, [days, toast]);

  if (loading) return <PageLoader label="Building report…" />;
  if (!report) return <p className="text-sm text-rose-600">Could not load reports.</p>;

  const totalBookings = report.daily.reduce((sum, row) => sum + row.bookings, 0);
  const totalRevenue = report.daily.reduce((sum, row) => sum + row.revenue, 0);
  const bestDay = [...report.daily].sort((a, b) => b.revenue - a.revenue)[0];
  const maxRevenue = Math.max(1, ...report.daily.map((row) => row.revenue));

  const exportCsv = () => {
    const rows = [['Date', 'Bookings', 'Revenue (INR)'], ...report.daily.map((row) => [row.day, row.bookings, row.revenue])];
    const csv = rows.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `utkalyatra-bookings-${days}d.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.push('Report exported as CSV.', 'success');
  };

  return (
    <div>
      <AdminHeader
        title="Reports"
        subtitle="Booking and revenue performance for the selected period."
        action={
          <div className="flex gap-2">
            <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="field w-auto">
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            <button type="button" onClick={exportCsv} className="btn btn-ghost"><Download className="size-4" /> Export CSV</button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Bookings in period" value={totalBookings} icon={<TrendingUp className="size-4" />} />
        <StatCard label="Revenue in period" value={formatINR(totalRevenue)} icon={<TrendingUp className="size-4" />} tone="emerald" />
        <StatCard label="Average fare" value={formatINR(totalBookings ? Math.round(totalRevenue / totalBookings) : 0)} icon={<TrendingUp className="size-4" />} tone="brand" />
        <StatCard label="Best day" value={bestDay ? formatDate(bestDay.day) : '—'} hint={bestDay ? formatINR(bestDay.revenue) : ''} icon={<TrendingUp className="size-4" />} tone="amber" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <h2 className="mb-2 text-sm font-bold text-ink-900">Daily revenue</h2>
          <TableShell head={['Date', 'Bookings', 'Revenue', '']}>
            {report.daily.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-sm text-ink-500">No bookings in this period.</td></tr>
            ) : (
              [...report.daily].reverse().map((row) => (
                <tr key={row.day}>
                  <td className="px-4 py-2.5 font-medium">{formatDate(row.day)}</td>
                  <td className="px-4 py-2.5 text-ink-500">{row.bookings}</td>
                  <td className="px-4 py-2.5 font-semibold">{formatINR(row.revenue)}</td>
                  <td className="w-40 px-4 py-2.5">
                    <div className="h-2 w-full rounded-full bg-mist-100">
                      <div className="h-2 rounded-full bg-brand-500" style={{ width: `${Math.round((row.revenue / maxRevenue) * 100)}%` }} />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </TableShell>
        </div>

        <div>
          <h2 className="mb-2 text-sm font-bold text-ink-900">Top routes</h2>
          <TableShell head={['Route', 'Bookings', 'Revenue']}>
            {report.topRoutes.length === 0 ? (
              <tr><td colSpan={3} className="px-4 py-6 text-center text-sm text-ink-500">No data yet.</td></tr>
            ) : (
              report.topRoutes.map((row) => (
                <tr key={row.routeLabel}>
                  <td className="px-4 py-2.5 font-medium">{row.routeLabel}</td>
                  <td className="px-4 py-2.5 text-ink-500">{row.bookings}</td>
                  <td className="px-4 py-2.5 font-semibold">{formatINR(row.revenue)}</td>
                </tr>
              ))
            )}
          </TableShell>
        </div>
      </div>
    </div>
  );
}
