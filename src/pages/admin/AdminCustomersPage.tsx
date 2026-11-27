import { useEffect, useState } from 'react';
import { Search, UserCheck, UserX } from 'lucide-react';
import { AdminHeader, IconButton, TableShell, Toolbar } from './parts';
import { PageLoader, StatusBadge } from '../../components/ui';
import { api, type AdminCustomer } from '../../lib/api';
import { formatDate, formatINR } from '../../lib/format';
import { useToast } from '../../lib/toast';

export default function AdminCustomersPage() {
  const toast = useToast();
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      setCustomers(await api.admin.customers());
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Could not load customers.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const toggle = async (customer: AdminCustomer) => {
    try {
      await api.admin.setCustomerActive(customer.id, !customer.active);
      toast.push(customer.active ? 'Customer account disabled.' : 'Customer account enabled.', 'success');
      await load();
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Could not update customer.', 'error');
    }
  };

  if (loading) return <PageLoader label="Loading customers…" />;

  const filtered = customers.filter((c) =>
    `${c.name} ${c.email} ${c.phone || ''}`.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div>
      <AdminHeader title="Customers" subtitle="Accounts, lifetime spend and access status." />
      <Toolbar>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-300" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email or phone" className="field w-72 pl-9" />
        </div>
        <span className="text-xs text-ink-500">{filtered.length} account(s)</span>
      </Toolbar>

      <TableShell head={['Customer', 'Contact', 'Bookings', 'Spend', 'Joined', 'Role', 'Access']}>
        {filtered.map((customer) => (
          <tr key={customer.id}>
            <td className="px-4 py-2.5 font-semibold">{customer.name}</td>
            <td className="px-4 py-2.5 text-ink-500">
              <p>{customer.email}</p>
              <p className="text-[11px]">{customer.phone || '—'}</p>
            </td>
            <td className="px-4 py-2.5">{customer.bookings}</td>
            <td className="px-4 py-2.5 font-semibold">{formatINR(customer.spend)}</td>
            <td className="px-4 py-2.5 text-ink-500">{formatDate(customer.createdAt)}</td>
            <td className="px-4 py-2.5"><StatusBadge status={customer.role === 'admin' ? 'approved' : 'created'} /></td>
            <td className="px-4 py-2.5">
              {customer.role === 'admin' ? (
                <span className="text-[11px] text-ink-300">—</span>
              ) : (
                <IconButton
                  label={customer.active ? 'Disable account' : 'Enable account'}
                  tone={customer.active ? 'danger' : 'success'}
                  onClick={() => toggle(customer)}
                >
                  {customer.active ? <UserX className="size-3.5" /> : <UserCheck className="size-3.5" />}
                </IconButton>
              )}
            </td>
          </tr>
        ))}
        {filtered.length === 0 ? (
          <tr><td colSpan={7} className="px-4 py-6 text-center text-sm text-ink-500">No customers found.</td></tr>
        ) : null}
      </TableShell>
    </div>
  );
}
