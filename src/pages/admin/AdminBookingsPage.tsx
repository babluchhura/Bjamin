import { useCallback, useEffect, useState } from 'react';
import { Ban, CheckCircle2, CreditCard, ExternalLink, RefreshCw, Search } from 'lucide-react';
import { AdminHeader, IconButton, TableShell, Toolbar } from './parts';
import { EmptyState, Modal, PageLoader, StatusBadge } from '../../components/ui';
import { api, type AdminBooking, type AdminPayment } from '../../lib/api';
import { formatDate, formatDateTime, formatINR } from '../../lib/format';
import { Link } from '../../lib/router';
import { useToast } from '../../lib/toast';

export default function AdminBookingsPage() {
  const toast = useToast();
  const [tab, setTab] = useState<'bookings' | 'payments'>('bookings');
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState<AdminBooking | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, paymentList] = await Promise.all([api.admin.bookings(status, q), api.admin.payments()]);
      setBookings(list);
      setPayments(paymentList);
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Could not load bookings.', 'error');
    } finally {
      setLoading(false);
    }
  }, [status, q, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const cancel = async () => {
    if (!target) return;
    setBusy(true);
    try {
      await api.cancelBooking(target.code, reason || 'Cancelled by administrator');
      toast.push(`Booking ${target.code} cancelled and seats released.`, 'success');
      setTarget(null);
      setReason('');
      await load();
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Could not cancel booking.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (booking: AdminBooking) => {
    setBusy(true);
    try {
      await api.admin.confirmBooking(booking.code, 'offline');
      toast.push(`Booking ${booking.code} confirmed with offline payment.`, 'success');
      await load();
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Could not confirm booking.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <AdminHeader
        title="Bookings & payments"
        subtitle="Confirm offline payments, cancel journeys and audit every transaction."
        action={<button type="button" onClick={load} className="btn btn-ghost"><RefreshCw className="size-4" /> Refresh</button>}
      />

      <div className="mb-4 flex gap-1 rounded-xl border border-mist-200 bg-white p-1">
        {[
          { key: 'bookings' as const, label: `Bookings (${bookings.length})` },
          { key: 'payments' as const, label: `Payments (${payments.length})` },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${tab === item.key ? 'bg-brand-50 text-brand-700' : 'text-ink-500'}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'bookings' ? (
        <>
          <Toolbar>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-300" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search code, name, email, phone" className="field w-72 pl-9" />
            </div>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="field w-auto">
              <option value="all">All statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </Toolbar>

          {loading ? (
            <PageLoader label="Loading bookings…" />
          ) : bookings.length === 0 ? (
            <EmptyState icon={<CreditCard className="size-5" />} title="No bookings match this filter" />
          ) : (
            <TableShell head={['Booking', 'Passenger', 'Route', 'Journey', 'Amount', 'Status', 'Actions']}>
              {bookings.map((booking) => (
                <tr key={booking.id}>
                  <td className="px-4 py-2.5">
                    <p className="font-semibold text-ink-900">{booking.code}</p>
                    <p className="text-[11px] text-ink-300">{formatDate(booking.createdAt)}</p>
                  </td>
                  <td className="px-4 py-2.5">
                    <p className="font-medium">{booking.contactName}</p>
                    <p className="text-[11px] text-ink-500">{booking.contactPhone}</p>
                  </td>
                  <td className="px-4 py-2.5 text-ink-500">
                    <p>{booking.routeLabel}</p>
                    <p className="text-[11px] text-ink-300">{booking.busName} · {booking.seats}</p>
                  </td>
                  <td className="px-4 py-2.5 text-ink-500">
                    <p>{formatDate(booking.departAt)}</p>
                    <p className="text-[11px] text-ink-300">{booking.passengerCount} passenger(s)</p>
                  </td>
                  <td className="px-4 py-2.5">
                    <p className="font-semibold">{formatINR(booking.totalAmount)}</p>
                    <p className="text-[11px] text-ink-300">{booking.paymentStatus}</p>
                  </td>
                  <td className="px-4 py-2.5"><StatusBadge status={booking.status} /></td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <Link to={`/bookings/${booking.code}`} aria-label="Open booking" title="Open booking" className="inline-flex size-8 items-center justify-center rounded-lg border border-mist-200 text-ink-600 hover:border-brand-300 hover:text-brand-700">
                        <ExternalLink className="size-3.5" />
                      </Link>
                      {booking.status === 'pending' ? (
                        <IconButton onClick={() => confirm(booking)} label="Record payment and confirm" tone="success">
                          <CheckCircle2 className="size-3.5" />
                        </IconButton>
                      ) : null}
                      {booking.status !== 'cancelled' ? (
                        <IconButton onClick={() => setTarget(booking)} label="Cancel booking" tone="danger">
                          <Ban className="size-3.5" />
                        </IconButton>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </TableShell>
          )}
        </>
      ) : (
        <TableShell head={['Payment', 'Booking', 'Customer', 'Amount', 'Status', 'Created']}>
          {payments.length === 0 ? (
            <tr><td colSpan={6} className="px-4 py-6 text-center text-sm text-ink-500">No payments recorded yet.</td></tr>
          ) : (
            payments.map((payment) => (
              <tr key={payment.id}>
                <td className="px-4 py-2.5">
                  <p className="font-semibold">{payment.provider}</p>
                  <p className="text-[11px] text-ink-300">{payment.paymentId || '—'}</p>
                </td>
                <td className="px-4 py-2.5"><Link to={`/bookings/${payment.bookingCode}`} className="font-semibold text-brand-700">{payment.bookingCode}</Link></td>
                <td className="px-4 py-2.5 text-ink-500">{payment.contactName}</td>
                <td className="px-4 py-2.5 font-semibold">{formatINR(payment.amount)}</td>
                <td className="px-4 py-2.5"><StatusBadge status={payment.status} /></td>
                <td className="px-4 py-2.5 text-[11px] text-ink-500">{formatDateTime(payment.createdAt)}</td>
              </tr>
            ))
          )}
        </TableShell>
      )}

      <Modal open={Boolean(target)} onClose={() => setTarget(null)} title={`Cancel ${target?.code || ''}`}>
        <p className="text-sm text-ink-500">
          Cancelling releases the seats immediately. If the booking is paid, the refund is calculated from the departure time
          (90% above 24h, 50% between 12–24h, none under 12h) and initiated through Razorpay.
        </p>
        <label className="mt-4 block">
          <span className="label">Reason</span>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="field" placeholder="Reason shared with the customer" />
        </label>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={() => setTarget(null)} className="btn btn-ghost">Keep booking</button>
          <button type="button" onClick={cancel} disabled={busy} className="btn btn-danger">{busy ? 'Cancelling…' : 'Confirm cancellation'}</button>
        </div>
      </Modal>
    </div>
  );
}
