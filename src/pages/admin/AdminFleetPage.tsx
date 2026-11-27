import { useCallback, useEffect, useState } from 'react';
import { BusFront, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { AdminHeader, IconButton, TableShell } from './parts';
import { Field, Modal, PageLoader } from '../../components/ui';
import { api, type AdminBus, type AdminOperator } from '../../lib/api';
import { useToast } from '../../lib/toast';

const BUS_TYPES = ['AC Seater', 'AC Sleeper', 'Non-AC Seater', 'Non-AC Sleeper'];
const LAYOUTS = [
  { value: 'seater-2-2', label: 'Seater 2 + 2 (40–44 seats)' },
  { value: 'seater-2-1', label: 'Seater 2 + 1 (36 seats)' },
  { value: 'sleeper-2-1', label: 'Sleeper 2 + 1, upper & lower deck' },
];

const emptyOperator = { name: '', contactEmail: '', contactPhone: '', rating: 4.2, active: true };
const emptyBus = {
  operatorId: 0,
  name: '',
  regNo: '',
  busType: 'AC Seater',
  layout: 'seater-2-2',
  totalSeats: 40,
  amenities: 'AC, Charging Point, Water Bottle',
  rating: 4.2,
  active: true,
};

export default function AdminFleetPage() {
  const toast = useToast();
  const [tab, setTab] = useState<'operators' | 'buses'>('operators');
  const [operators, setOperators] = useState<AdminOperator[]>([]);
  const [buses, setBuses] = useState<AdminBus[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [operatorForm, setOperatorForm] = useState<typeof emptyOperator & { id?: number }>(emptyOperator);
  const [busForm, setBusForm] = useState<typeof emptyBus & { id?: number }>(emptyBus);
  const [operatorOpen, setOperatorOpen] = useState(false);
  const [busOpen, setBusOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [opList, busList] = await Promise.all([api.admin.operators(), api.admin.buses()]);
      setOperators(opList);
      setBuses(busList);
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Could not load fleet.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveOperator = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (operatorForm.id) await api.admin.updateOperator(operatorForm.id, operatorForm);
      else await api.admin.createOperator(operatorForm);
      toast.push('Operator saved.', 'success');
      setOperatorOpen(false);
      setOperatorForm(emptyOperator);
      await load();
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Could not save operator.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const saveBus = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const payload = {
      ...busForm,
      operatorId: Number(busForm.operatorId),
      totalSeats: Number(busForm.totalSeats),
      rating: Number(busForm.rating),
      amenities: busForm.amenities.split(',').map((a) => a.trim()).filter(Boolean),
    };
    try {
      if (busForm.id) await api.admin.updateBus(busForm.id, payload);
      else await api.admin.createBus(payload);
      toast.push('Bus saved. New departures will use this seat layout.', 'success');
      setBusOpen(false);
      setBusForm(emptyBus);
      await load();
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Could not save bus.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const removeOperator = async (operator: AdminOperator) => {
    if (!confirm(`Delete ${operator.name}? Buses and departures for this operator are removed too.`)) return;
    try {
      await api.admin.deleteOperator(operator.id);
      toast.push('Operator deleted.', 'success');
      await load();
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Could not delete operator.', 'error');
    }
  };

  const removeBus = async (bus: AdminBus) => {
    if (!confirm(`Delete ${bus.name}? Its departures and seats will be removed.`)) return;
    try {
      await api.admin.deleteBus(bus.id);
      toast.push('Bus deleted.', 'success');
      await load();
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Could not delete bus.', 'error');
    }
  };

  if (loading) return <PageLoader label="Loading fleet…" />;

  return (
    <div>
      <AdminHeader
        title="Operators & buses"
        subtitle="Every bus belongs to an operator; seat layouts drive the live seat map."
        action={
          <button
            type="button"
            onClick={() => {
              if (tab === 'operators') {
                setOperatorForm(emptyOperator);
                setOperatorOpen(true);
              } else {
                setBusForm({ ...emptyBus, operatorId: operators[0]?.id || 0 });
                setBusOpen(true);
              }
            }}
            className="btn btn-primary"
          >
            <Plus className="size-4" /> {tab === 'operators' ? 'Add operator' : 'Add bus'}
          </button>
        }
      />

      <div className="mb-4 flex gap-1 rounded-xl border border-mist-200 bg-white p-1">
        {[
          { key: 'operators' as const, label: `Operators (${operators.length})`, icon: <Users className="size-3.5" /> },
          { key: 'buses' as const, label: `Buses (${buses.length})`, icon: <BusFront className="size-3.5" /> },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold ${tab === item.key ? 'bg-brand-50 text-brand-700' : 'text-ink-500'}`}
          >
            {item.icon} {item.label}
          </button>
        ))}
      </div>

      {tab === 'operators' ? (
        <TableShell head={['Operator', 'Contact', 'Rating', 'Status', 'Actions']}>
          {operators.map((operator) => (
            <tr key={operator.id}>
              <td className="px-4 py-2.5 font-semibold">{operator.name}</td>
              <td className="px-4 py-2.5 text-ink-500">
                <p>{operator.contactEmail || '—'}</p>
                <p className="text-[11px]">{operator.contactPhone || '—'}</p>
              </td>
              <td className="px-4 py-2.5">{operator.rating.toFixed(1)}</td>
              <td className="px-4 py-2.5">
                <span className={`text-xs font-bold ${operator.active ? 'text-emerald-600' : 'text-slate-400'}`}>{operator.active ? 'Active' : 'Inactive'}</span>
              </td>
              <td className="px-4 py-2.5">
                <div className="flex gap-1.5">
                  <IconButton
                    label="Edit operator"
                    onClick={() => {
                      setOperatorForm({ ...operator, contactEmail: operator.contactEmail || '', contactPhone: operator.contactPhone || '' });
                      setOperatorOpen(true);
                    }}
                  >
                    <Pencil className="size-3.5" />
                  </IconButton>
                  <IconButton label="Delete operator" tone="danger" onClick={() => removeOperator(operator)}>
                    <Trash2 className="size-3.5" />
                  </IconButton>
                </div>
              </td>
            </tr>
          ))}
          {operators.length === 0 ? (
            <tr><td colSpan={5} className="px-4 py-6 text-center text-sm text-ink-500">No operators yet.</td></tr>
          ) : null}
        </TableShell>
      ) : (
        <TableShell head={['Bus', 'Operator', 'Type & layout', 'Seats', 'Status', 'Actions']}>
          {buses.map((bus) => (
            <tr key={bus.id}>
              <td className="px-4 py-2.5">
                <p className="font-semibold">{bus.name}</p>
                <p className="text-[11px] text-ink-300">{bus.regNo}</p>
              </td>
              <td className="px-4 py-2.5 text-ink-500">{bus.operatorName}</td>
              <td className="px-4 py-2.5 text-ink-500">
                <p>{bus.busType}</p>
                <p className="text-[11px] text-ink-300">{bus.layout}</p>
              </td>
              <td className="px-4 py-2.5">{bus.totalSeats}</td>
              <td className="px-4 py-2.5">
                <span className={`text-xs font-bold ${bus.active ? 'text-emerald-600' : 'text-slate-400'}`}>{bus.active ? 'Active' : 'Inactive'}</span>
              </td>
              <td className="px-4 py-2.5">
                <div className="flex gap-1.5">
                  <IconButton
                    label="Edit bus"
                    onClick={() => {
                      setBusForm({ ...bus, amenities: (bus.amenities || []).join(', ') });
                      setBusOpen(true);
                    }}
                  >
                    <Pencil className="size-3.5" />
                  </IconButton>
                  <IconButton label="Delete bus" tone="danger" onClick={() => removeBus(bus)}>
                    <Trash2 className="size-3.5" />
                  </IconButton>
                </div>
              </td>
            </tr>
          ))}
          {buses.length === 0 ? (
            <tr><td colSpan={6} className="px-4 py-6 text-center text-sm text-ink-500">No buses yet.</td></tr>
          ) : null}
        </TableShell>
      )}

      <Modal open={operatorOpen} onClose={() => setOperatorOpen(false)} title={operatorForm.id ? 'Edit operator' : 'Add operator'}>
        <form onSubmit={saveOperator} className="space-y-3">
          <Field label="Operator name">
            <input value={operatorForm.name} onChange={(e) => setOperatorForm({ ...operatorForm, name: e.target.value })} className="field" required />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Contact email">
              <input type="email" value={operatorForm.contactEmail} onChange={(e) => setOperatorForm({ ...operatorForm, contactEmail: e.target.value })} className="field" />
            </Field>
            <Field label="Contact phone">
              <input value={operatorForm.contactPhone} onChange={(e) => setOperatorForm({ ...operatorForm, contactPhone: e.target.value })} className="field" />
            </Field>
            <Field label="Rating (0–5)">
              <input type="number" step="0.1" min="0" max="5" value={operatorForm.rating} onChange={(e) => setOperatorForm({ ...operatorForm, rating: Number(e.target.value) })} className="field" />
            </Field>
            <label className="flex items-end gap-2 pb-2 text-sm">
              <input type="checkbox" checked={operatorForm.active} onChange={(e) => setOperatorForm({ ...operatorForm, active: e.target.checked })} className="size-4 accent-brand-600" />
              Active
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOperatorOpen(false)} className="btn btn-ghost">Cancel</button>
            <button type="submit" disabled={busy} className="btn btn-primary">{busy ? 'Saving…' : 'Save operator'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={busOpen} onClose={() => setBusOpen(false)} title={busForm.id ? 'Edit bus' : 'Add bus'} wide>
        <form onSubmit={saveBus} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Operator">
              <select value={busForm.operatorId} onChange={(e) => setBusForm({ ...busForm, operatorId: Number(e.target.value) })} className="field" required>
                <option value={0}>Select operator</option>
                {operators.map((operator) => (
                  <option key={operator.id} value={operator.id}>{operator.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Bus name">
              <input value={busForm.name} onChange={(e) => setBusForm({ ...busForm, name: e.target.value })} className="field" required />
            </Field>
            <Field label="Registration number">
              <input value={busForm.regNo} onChange={(e) => setBusForm({ ...busForm, regNo: e.target.value })} className="field" required />
            </Field>
            <Field label="Bus type">
              <select value={busForm.busType} onChange={(e) => setBusForm({ ...busForm, busType: e.target.value })} className="field">
                {BUS_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </Field>
            <Field label="Seat layout">
              <select value={busForm.layout} onChange={(e) => setBusForm({ ...busForm, layout: e.target.value })} className="field">
                {LAYOUTS.map((layout) => (
                  <option key={layout.value} value={layout.value}>{layout.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Total seats" hint="6–60 seats. Applies to departures created after saving.">
              <input type="number" min="6" max="60" value={busForm.totalSeats} onChange={(e) => setBusForm({ ...busForm, totalSeats: Number(e.target.value) })} className="field" />
            </Field>
            <Field label="Rating">
              <input type="number" step="0.1" min="0" max="5" value={busForm.rating} onChange={(e) => setBusForm({ ...busForm, rating: Number(e.target.value) })} className="field" />
            </Field>
            <label className="flex items-end gap-2 pb-2 text-sm">
              <input type="checkbox" checked={busForm.active} onChange={(e) => setBusForm({ ...busForm, active: e.target.checked })} className="size-4 accent-brand-600" />
              Active
            </label>
          </div>
          <Field label="Amenities" hint="Comma separated, e.g. AC, Blanket, WiFi">
            <input value={busForm.amenities} onChange={(e) => setBusForm({ ...busForm, amenities: e.target.value })} className="field" />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setBusOpen(false)} className="btn btn-ghost">Cancel</button>
            <button type="submit" disabled={busy} className="btn btn-primary">{busy ? 'Saving…' : 'Save bus'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
