import { useCallback, useEffect, useState } from 'react';
import { CalendarPlus, MapPin, Pencil, Plus, Route as RouteIcon, Trash2 } from 'lucide-react';
import { AdminHeader, IconButton, TableShell } from './parts';
import { Field, Modal, PageLoader, StatusBadge } from '../../components/ui';
import { api, type AdminBus, type AdminRoute, type AdminTrip } from '../../lib/api';
import { formatDateTime, formatINR, toInputDate } from '../../lib/format';
import { useToast } from '../../lib/toast';

const emptyRoute = { origin: '', destination: '', distanceKm: 0, durationMin: 0, active: true };

export default function AdminRoutesPage() {
  const toast = useToast();
  const [tab, setTab] = useState<'routes' | 'schedules'>('schedules');
  const [routes, setRoutes] = useState<AdminRoute[]>([]);
  const [buses, setBuses] = useState<AdminBus[]>([]);
  const [trips, setTrips] = useState<AdminTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [routeForm, setRouteForm] = useState<typeof emptyRoute & { id?: number }>(emptyRoute);
  const [routeOpen, setRouteOpen] = useState(false);
  const [tripOpen, setTripOpen] = useState(false);
  const [tripForm, setTripForm] = useState({ busId: 0, routeId: 0, date: toInputDate(new Date(Date.now() + 86400000)), time: '20:30', fare: 499 });
  const [pointsTrip, setPointsTrip] = useState<AdminTrip | null>(null);
  const [boardingText, setBoardingText] = useState('');
  const [droppingText, setDroppingText] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [routeList, busList, tripList] = await Promise.all([api.admin.routes(), api.admin.buses(), api.admin.trips()]);
      setRoutes(routeList);
      setBuses(busList);
      setTrips(tripList);
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Could not load routes.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveRoute = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (routeForm.id) await api.admin.updateRoute(routeForm.id, routeForm);
      else await api.admin.createRoute(routeForm);
      toast.push('Route saved.', 'success');
      setRouteOpen(false);
      setRouteForm(emptyRoute);
      await load();
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Could not save route.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const createTrip = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await api.admin.createTrip({
        busId: tripForm.busId,
        routeId: tripForm.routeId,
        departAt: new Date(`${tripForm.date}T${tripForm.time}:00`).toISOString(),
        fare: tripForm.fare,
      });
      toast.push('Departure created with a fresh seat map.', 'success');
      setTripOpen(false);
      await load();
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Could not create departure.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const updateFare = async (trip: AdminTrip) => {
    const next = prompt(`New fare for ${trip.origin} → ${trip.destination} on ${formatDateTime(trip.departAt)}`, String(trip.fare));
    if (!next) return;
    try {
      await api.admin.updateTrip(trip.id, { fare: Number(next), status: trip.status });
      toast.push('Fare updated.', 'success');
      await load();
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Could not update fare.', 'error');
    }
  };

  const removeTrip = async (trip: AdminTrip) => {
    if (!confirm('Delete this departure? Existing bookings for it will block deletion.')) return;
    try {
      await api.admin.deleteTrip(trip.id);
      toast.push('Departure deleted.', 'success');
      await load();
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Could not delete departure. It may have bookings.', 'error');
    }
  };

  const openPoints = async (trip: AdminTrip) => {
    setPointsTrip(trip);
    try {
      const points = await api.admin.tripPoints(trip.id);
      const toText = (list: Array<{ name: string; city: string; time: string; landmark?: string | null }>) =>
        list.map((p) => [p.name, p.city, p.time, p.landmark || ''].join(' | ')).join('\n');
      setBoardingText(toText(points.boarding));
      setDroppingText(toText(points.dropping));
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Could not load points.', 'error');
    }
  };

  const savePoints = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!pointsTrip) return;
    const parse = (text: string) =>
      text
        .split('\n')
        .map((line) => line.split('|').map((part) => part.trim()))
        .filter((parts) => parts[0] && parts[1])
        .map((parts) => ({ name: parts[0], city: parts[1], time: parts[2] || '00:00', landmark: parts[3] || '' }));
    setBusy(true);
    try {
      await api.admin.saveTripPoints(pointsTrip.id, { boarding: parse(boardingText), dropping: parse(droppingText) });
      toast.push('Boarding and dropping points updated.', 'success');
      setPointsTrip(null);
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Could not save points.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const removeRoute = async (route: AdminRoute) => {
    if (!confirm(`Delete ${route.origin} → ${route.destination}? Departures on this route are removed.`)) return;
    try {
      await api.admin.deleteRoute(route.id);
      toast.push('Route deleted.', 'success');
      await load();
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Could not delete route.', 'error');
    }
  };

  if (loading) return <PageLoader label="Loading schedules…" />;

  return (
    <div>
      <AdminHeader
        title="Routes & schedules"
        subtitle="Create routes once, then publish dated departures with fares and seat maps."
        action={
          <div className="flex gap-2">
            <button type="button" onClick={() => { setRouteForm(emptyRoute); setRouteOpen(true); }} className="btn btn-ghost">
              <Plus className="size-4" /> Add route
            </button>
            <button
              type="button"
              onClick={() => {
                setTripForm((current) => ({ ...current, busId: buses[0]?.id || 0, routeId: routes[0]?.id || 0 }));
                setTripOpen(true);
              }}
              className="btn btn-primary"
            >
              <CalendarPlus className="size-4" /> New departure
            </button>
          </div>
        }
      />

      <div className="mb-4 flex gap-1 rounded-xl border border-mist-200 bg-white p-1">
        {[
          { key: 'schedules' as const, label: `Departures (${trips.length})` },
          { key: 'routes' as const, label: `Routes (${routes.length})` },
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

      {tab === 'schedules' ? (
        <TableShell head={['Route', 'Bus', 'Departure', 'Arrival', 'Fare', 'Status', 'Actions']}>
          {trips.map((trip) => (
            <tr key={trip.id}>
              <td className="px-4 py-2.5 font-semibold">{trip.origin} → {trip.destination}</td>
              <td className="px-4 py-2.5 text-ink-500">
                <p>{trip.busName}</p>
                <p className="text-[11px] text-ink-300">{trip.operatorName} · {trip.busType}</p>
              </td>
              <td className="px-4 py-2.5 text-ink-500">{formatDateTime(trip.departAt)}</td>
              <td className="px-4 py-2.5 text-ink-500">{formatDateTime(trip.arriveAt)}</td>
              <td className="px-4 py-2.5 font-semibold">{formatINR(trip.fare)}</td>
              <td className="px-4 py-2.5"><StatusBadge status={trip.status} /></td>
              <td className="px-4 py-2.5">
                <div className="flex gap-1.5">
                  <IconButton label="Boarding & dropping points" onClick={() => openPoints(trip)}>
                    <MapPin className="size-3.5" />
                  </IconButton>
                  <IconButton label="Edit fare" onClick={() => updateFare(trip)}>
                    <Pencil className="size-3.5" />
                  </IconButton>
                  <IconButton label="Delete departure" tone="danger" onClick={() => removeTrip(trip)}>
                    <Trash2 className="size-3.5" />
                  </IconButton>
                </div>
              </td>
            </tr>
          ))}
          {trips.length === 0 ? (
            <tr><td colSpan={7} className="px-4 py-6 text-center text-sm text-ink-500">No upcoming departures.</td></tr>
          ) : null}
        </TableShell>
      ) : (
        <TableShell head={['Route', 'Distance', 'Duration', 'Status', 'Actions']}>
          {routes.map((route) => (
            <tr key={route.id}>
              <td className="px-4 py-2.5 font-semibold"><span className="inline-flex items-center gap-1.5"><RouteIcon className="size-3.5 text-brand-500" /> {route.origin} → {route.destination}</span></td>
              <td className="px-4 py-2.5 text-ink-500">{route.distanceKm} km</td>
              <td className="px-4 py-2.5 text-ink-500">{Math.floor(route.durationMin / 60)}h {route.durationMin % 60}m</td>
              <td className="px-4 py-2.5">
                <span className={`text-xs font-bold ${route.active ? 'text-emerald-600' : 'text-slate-400'}`}>{route.active ? 'Active' : 'Inactive'}</span>
              </td>
              <td className="px-4 py-2.5">
                <div className="flex gap-1.5">
                  <IconButton label="Edit route" onClick={() => { setRouteForm(route); setRouteOpen(true); }}>
                    <Pencil className="size-3.5" />
                  </IconButton>
                  <IconButton label="Delete route" tone="danger" onClick={() => removeRoute(route)}>
                    <Trash2 className="size-3.5" />
                  </IconButton>
                </div>
              </td>
            </tr>
          ))}
        </TableShell>
      )}

      <Modal open={routeOpen} onClose={() => setRouteOpen(false)} title={routeForm.id ? 'Edit route' : 'Add route'}>
        <form onSubmit={saveRoute} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Origin city">
              <input value={routeForm.origin} onChange={(e) => setRouteForm({ ...routeForm, origin: e.target.value })} className="field" required />
            </Field>
            <Field label="Destination city">
              <input value={routeForm.destination} onChange={(e) => setRouteForm({ ...routeForm, destination: e.target.value })} className="field" required />
            </Field>
            <Field label="Distance (km)">
              <input type="number" min="0" value={routeForm.distanceKm} onChange={(e) => setRouteForm({ ...routeForm, distanceKm: Number(e.target.value) })} className="field" />
            </Field>
            <Field label="Duration (minutes)">
              <input type="number" min="0" value={routeForm.durationMin} onChange={(e) => setRouteForm({ ...routeForm, durationMin: Number(e.target.value) })} className="field" />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={routeForm.active} onChange={(e) => setRouteForm({ ...routeForm, active: e.target.checked })} className="size-4 accent-brand-600" />
            Active route
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setRouteOpen(false)} className="btn btn-ghost">Cancel</button>
            <button type="submit" disabled={busy} className="btn btn-primary">{busy ? 'Saving…' : 'Save route'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(pointsTrip)} onClose={() => setPointsTrip(null)} title="Boarding & dropping points" wide>
        <form onSubmit={savePoints} className="space-y-3">
          <p className="rounded-lg bg-mist-50 px-3 py-2 text-[11px] leading-relaxed text-ink-500">
            One point per line: <span className="font-mono">Name | City | HH:MM | Landmark</span>. Existing bookings keep the point
            name they were sold with.
          </p>
          <Field label="Boarding points">
            <textarea rows={5} value={boardingText} onChange={(e) => setBoardingText(e.target.value)} className="field font-mono text-xs" />
          </Field>
          <Field label="Dropping points">
            <textarea rows={5} value={droppingText} onChange={(e) => setDroppingText(e.target.value)} className="field font-mono text-xs" />
          </Field>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setPointsTrip(null)} className="btn btn-ghost">Cancel</button>
            <button type="submit" disabled={busy} className="btn btn-primary">{busy ? 'Saving…' : 'Save points'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={tripOpen} onClose={() => setTripOpen(false)} title="Publish a departure">
        <form onSubmit={createTrip} className="space-y-3">
          <Field label="Bus">
            <select value={tripForm.busId} onChange={(e) => setTripForm({ ...tripForm, busId: Number(e.target.value) })} className="field" required>
              <option value={0}>Select bus</option>
              {buses.map((bus) => (
                <option key={bus.id} value={bus.id}>{bus.name} · {bus.busType} ({bus.totalSeats} seats)</option>
              ))}
            </select>
          </Field>
          <Field label="Route">
            <select value={tripForm.routeId} onChange={(e) => setTripForm({ ...tripForm, routeId: Number(e.target.value) })} className="field" required>
              <option value={0}>Select route</option>
              {routes.map((route) => (
                <option key={route.id} value={route.id}>{route.origin} → {route.destination}</option>
              ))}
            </select>
          </Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Date">
              <input type="date" value={tripForm.date} onChange={(e) => setTripForm({ ...tripForm, date: e.target.value })} className="field" required />
            </Field>
            <Field label="Departure time">
              <input type="time" value={tripForm.time} onChange={(e) => setTripForm({ ...tripForm, time: e.target.value })} className="field" required />
            </Field>
            <Field label="Fare (₹)">
              <input type="number" min="1" value={tripForm.fare} onChange={(e) => setTripForm({ ...tripForm, fare: Number(e.target.value) })} className="field" required />
            </Field>
          </div>
          <p className="rounded-lg bg-mist-50 px-3 py-2 text-[11px] text-ink-500">
            Arrival is calculated from the route duration. A full seat map and default boarding/dropping points are generated automatically.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setTripOpen(false)} className="btn btn-ghost">Cancel</button>
            <button type="submit" disabled={busy} className="btn btn-primary">{busy ? 'Publishing…' : 'Publish departure'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
