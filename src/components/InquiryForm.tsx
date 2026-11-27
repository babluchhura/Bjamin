import React, { useState } from 'react';
import { CheckCircle2, MessageCircle, Send } from 'lucide-react';
import { api, buildWhatsAppUrl } from '../lib/api';
import type { PlotItem } from '../types/estate';

interface InquiryFormProps {
  plot?: PlotItem | null;
  plots?: PlotItem[];
  whatsappNumber: string;
  heading?: string;
}

export const InquiryForm: React.FC<InquiryFormProps> = ({
  plot,
  plots = [],
  whatsappNumber,
  heading = 'Request Property Details',
}) => {
  const [selectedPlotId, setSelectedPlotId] = useState<string>(plot ? String(plot.id) : '');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [message, setMessage] = useState(
    plot
      ? `I would like to receive the legal title summary, layout plan, and payment schedule for ${plot.plotCode} (${plot.name}).`
      : ''
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (customerName.trim().length < 2) {
      setError('Please enter your full name.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    if (customerPhone.trim().length < 6) {
      setError('Please enter a valid phone or WhatsApp number.');
      return;
    }
    if (message.trim().length < 5) {
      setError('Please enter a brief inquiry message.');
      return;
    }

    setSubmitting(true);
    try {
      const targetId = plot ? plot.id : selectedPlotId ? Number(selectedPlotId) : null;
      const targetPlot = plot || plots.find((p) => p.id === targetId) || null;

      await api.submitInquiry({
        plotId: targetPlot ? targetPlot.id : null,
        plotName: targetPlot ? `${targetPlot.plotCode} — ${targetPlot.name}` : 'General Inquiry',
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        customerPhone: customerPhone.trim(),
        message: message.trim(),
      });

      setSuccess(true);
      setCustomerName('');
      setCustomerEmail('');
      setCustomerPhone('');
      if (!plot) setMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send inquiry.');
    } finally {
      setSubmitting(false);
    }
  };

  const waMessage = plot
    ? `Hello, I am inquiring about plot ${plot.plotCode} (${plot.name}).`
    : 'Hello, I would like information about your available residential plots.';

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-[#E2E8E5] rounded-lg p-6 space-y-4"
      noValidate
    >
      <div>
        <h3 className="font-display text-2xl font-semibold text-[#0B281F]">{heading}</h3>
        <p className="text-sm text-[#4B635A] mt-1">
          Receive verified survey documents, title clearance copies, and flexible purchase terms.
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

      {success && (
        <div
          role="status"
          className="px-4 py-3 rounded-md bg-emerald-50 border border-emerald-200 text-sm text-[#0B281F] flex items-start gap-2.5"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          <span>
            Thank you. Your inquiry has been logged and our land advisory team will reach out
            shortly.
          </span>
        </div>
      )}

      {!plot && plots.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-[#3D524A] mb-1.5">
            Interested Plot (Optional)
          </label>
          <select
            value={selectedPlotId}
            onChange={(e) => setSelectedPlotId(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#D4DDD8] rounded-md text-[#10241D]"
          >
            <option value="">General Estate Inquiry</option>
            {plots.map((item) => (
              <option key={item.id} value={item.id}>
                {item.plotCode} — {item.name} ({item.status})
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-[#3D524A] mb-1.5">
            Full Name *
          </label>
          <input
            type="text"
            required
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Your full name"
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#D4DDD8] rounded-md text-[#10241D]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#3D524A] mb-1.5">
            Phone / WhatsApp *
          </label>
          <input
            type="tel"
            required
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            placeholder="+91 98765 43210"
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#D4DDD8] rounded-md text-[#10241D]"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-[#3D524A] mb-1.5">
          Email Address *
        </label>
        <input
          type="email"
          required
          value={customerEmail}
          onChange={(e) => setCustomerEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#D4DDD8] rounded-md text-[#10241D]"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-[#3D524A] mb-1.5">Message *</label>
        <textarea
          rows={3}
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us about your preferred plot size, timeline, or questions..."
          className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#D4DDD8] rounded-md text-[#10241D]"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-1">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#0B281F] rounded-md hover:bg-[#12382B] disabled:opacity-60 transition-colors"
        >
          <Send className="w-4 h-4" />
          {submitting ? 'Sending...' : 'Send Inquiry'}
        </button>

        <a
          href={buildWhatsAppUrl(whatsappNumber, waMessage)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-[#0B281F] bg-[#FBF7EB] border border-[#D1AA48] rounded-md hover:bg-[#F5ECCD] transition-colors whitespace-nowrap"
        >
          <MessageCircle className="w-4 h-4" />
          WhatsApp Owner
        </a>
      </div>
    </form>
  );
};
