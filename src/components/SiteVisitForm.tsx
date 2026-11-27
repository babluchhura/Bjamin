import React, { useEffect, useState } from 'react';
import { CalendarCheck, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api';
import type { PlotItem } from '../types/estate';

interface SiteVisitFormProps {
  plots: PlotItem[];
  preselectedPlotId?: number | null;
}

const TIME_SLOTS = [
  '09:30 AM – 10:30 AM',
  '11:00 AM – 12:00 PM',
  '02:00 PM – 03:00 PM',
  '04:00 PM – 05:00 PM',
];

export const SiteVisitForm: React.FC<SiteVisitFormProps> = ({
  plots,
  preselectedPlotId,
}) => {
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const [plotId, setPlotId] = useState<string>(
    preselectedPlotId ? String(preselectedPlotId) : ''
  );
  const [visitorName, setVisitorName] = useState('');
  const [visitorEmail, setVisitorEmail] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [preferredDate, setPreferredDate] = useState(tomorrow);
  const [preferredTime, setPreferredTime] = useState(TIME_SLOTS[0]);
  const [guestsCount, setGuestsCount] = useState(2);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<string | null>(null);

  useEffect(() => {
    if (preselectedPlotId) setPlotId(String(preselectedPlotId));
  }, [preselectedPlotId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setConfirmed(null);

    if (visitorName.trim().length < 2) {
      setError('Please enter your full name.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(visitorEmail.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    if (visitorPhone.trim().length < 6) {
      setError('Please enter a valid phone number.');
      return;
    }
    if (!preferredDate) {
      setError('Please pick a preferred tour date.');
      return;
    }

    setSubmitting(true);
    try {
      const chosen = plots.find((p) => p.id === Number(plotId)) || null;
      await api.bookSiteVisit({
        plotId: chosen ? chosen.id : null,
        plotName: chosen ? `${chosen.plotCode} — ${chosen.name}` : 'General Estate Tour',
        visitorName: visitorName.trim(),
        visitorEmail: visitorEmail.trim(),
        visitorPhone: visitorPhone.trim(),
        preferredDate,
        preferredTime,
        guestsCount,
        notes: notes.trim() || undefined,
      });

      setConfirmed(
        `Your site visit for ${preferredDate} (${preferredTime}) has been scheduled.`
      );
      setVisitorName('');
      setVisitorEmail('');
      setVisitorPhone('');
      setNotes('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to book site visit.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-[#E2E8E5] rounded-lg p-6 lg:p-8 space-y-5"
      noValidate
    >
      <div>
        <h2 className="font-display text-3xl font-semibold text-[#0B281F]">
          Schedule Your Guided Site Tour
        </h2>
        <p className="text-sm text-[#4B635A] mt-1">
          Walk the parcel boundaries in person with our land surveyor and review original title
          records on-site.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="px-4 py-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      {confirmed && (
        <div
          role="status"
          className="px-4 py-3.5 rounded-md bg-emerald-50 border border-emerald-200 text-sm text-[#0B281F] flex items-start gap-2.5"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Site Visit Requested</div>
            <div className="text-[#3D524A] mt-0.5">{confirmed}</div>
          </div>
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-[#3D524A] mb-1.5">
          Select Plot to Inspect
        </label>
        <select
          value={plotId}
          onChange={(e) => setPlotId(e.target.value)}
          className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#D4DDD8] rounded-md text-[#10241D]"
        >
          <option value="">General Estate Tour (Multiple Enclaves)</option>
          {plots.map((item) => (
            <option key={item.id} value={item.id}>
              {item.plotCode} — {item.name} ({item.location} · {item.status})
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-[#3D524A] mb-1.5">
            Full Name *
          </label>
          <input
            type="text"
            required
            value={visitorName}
            onChange={(e) => setVisitorName(e.target.value)}
            placeholder="Jane Doe"
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#D4DDD8] rounded-md text-[#10241D]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#3D524A] mb-1.5">
            Phone Number *
          </label>
          <input
            type="tel"
            required
            value={visitorPhone}
            onChange={(e) => setVisitorPhone(e.target.value)}
            placeholder="+91 98765 43210"
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#D4DDD8] rounded-md text-[#10241D]"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-[#3D524A] mb-1.5">
            Email Address *
          </label>
          <input
            type="email"
            required
            value={visitorEmail}
            onChange={(e) => setVisitorEmail(e.target.value)}
            placeholder="jane@example.com"
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#D4DDD8] rounded-md text-[#10241D]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#3D524A] mb-1.5">
            Number of Visitors
          </label>
          <input
            type="number"
            min={1}
            max={12}
            value={guestsCount}
            onChange={(e) => setGuestsCount(Math.max(1, Number(e.target.value) || 1))}
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#D4DDD8] rounded-md text-[#10241D] tabular-nums"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-[#3D524A] mb-1.5">
            Preferred Date *
          </label>
          <input
            type="date"
            required
            min={tomorrow}
            value={preferredDate}
            onChange={(e) => setPreferredDate(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#D4DDD8] rounded-md text-[#10241D] tabular-nums"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#3D524A] mb-1.5">
            Preferred Time Slot *
          </label>
          <select
            value={preferredTime}
            onChange={(e) => setPreferredTime(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#D4DDD8] rounded-md text-[#10241D]"
          >
            {TIME_SLOTS.map((slot) => (
              <option key={slot} value={slot}>
                {slot}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-[#3D524A] mb-1.5">
          Special Requests or Questions (Optional)
        </label>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Need pickup from downtown or would like to inspect corner plots..."
          className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#D4DDD8] rounded-md text-[#10241D]"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[#0B281F] rounded-md hover:bg-[#12382B] disabled:opacity-60 transition-colors"
      >
        <CalendarCheck className="w-4 h-4" />
        {submitting ? 'Confirming Booking...' : 'Confirm Site Visit'}
      </button>
    </form>
  );
};
