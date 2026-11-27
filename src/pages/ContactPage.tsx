import { useState } from 'react';
import { Clock, Mail, MapPin, MessageCircle, Phone, Send } from 'lucide-react';
import { Field } from '../components/ui';
import { api } from '../lib/api';
import { useSite } from '../lib/site';
import { useToast } from '../lib/toast';

export default function ContactPage() {
  const { settings } = useSite();
  const toast = useToast();
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: 'Booking help', message: '' });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await api.contact(form);
      setSent(true);
      toast.push('Message sent. Our team replies within one business day.', 'success');
      setForm({ name: '', email: '', phone: '', subject: 'Booking help', message: '' });
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Could not send your message.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-shell py-10">
      <div className="max-w-2xl">
        <h1 className="font-display text-3xl font-semibold text-ink-900">Contact us</h1>
        <p className="mt-2 text-sm text-ink-500">
          Booking questions, refunds or operator partnerships — reach the {settings.brandName} team in Bhubaneswar.
        </p>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-3">
          {[
            { icon: <Phone className="size-4" />, label: 'Call us', value: settings.supportPhone, href: `tel:${settings.supportPhone?.replace(/\s/g, '')}` },
            { icon: <Mail className="size-4" />, label: 'Email', value: settings.supportEmail, href: `mailto:${settings.supportEmail}` },
            { icon: <MessageCircle className="size-4" />, label: 'WhatsApp', value: 'Chat with support', href: `https://wa.me/${settings.whatsappNumber}` },
            { icon: <MapPin className="size-4" />, label: 'Office', value: settings.officeAddress },
            { icon: <Clock className="size-4" />, label: 'Hours', value: '7:00 AM – 11:00 PM, all days' },
          ].map((item) => (
            <div key={item.label} className="card flex items-start gap-3 p-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">{item.icon}</span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-ink-500">{item.label}</p>
                {item.href ? (
                  <a href={item.href} target={item.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer" className="text-sm font-semibold text-ink-900 hover:text-brand-700">
                    {item.value}
                  </a>
                ) : (
                  <p className="text-sm font-semibold text-ink-900">{item.value}</p>
                )}
              </div>
            </div>
          ))}

          <div className="card overflow-hidden">
            <iframe
              title="Utkal Yatra office location"
              src={`https://www.google.com/maps?q=${encodeURIComponent(settings.officeAddress || 'Bhubaneswar, Odisha')}&output=embed`}
              className="h-56 w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>

        <form onSubmit={submit} className="card p-5">
          <h2 className="text-base font-semibold">Send us a message</h2>
          <p className="mt-1 text-xs text-ink-500">Include your booking ID if your question is about a ticket.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Your name">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="field" required />
            </Field>
            <Field label="Email">
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="field" required />
            </Field>
            <Field label="Mobile (optional)">
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} className="field" inputMode="numeric" />
            </Field>
            <Field label="Subject">
              <select value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="field">
                <option>Booking help</option>
                <option>Refund status</option>
                <option>Change my trip</option>
                <option>Operator partnership</option>
                <option>Other</option>
              </select>
            </Field>
          </div>
          <Field label="Message">
            <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={5} className="field" required />
          </Field>
          <button type="submit" disabled={busy} className="btn btn-primary mt-4 w-full sm:w-auto">
            <Send className="size-4" /> {busy ? 'Sending…' : 'Send message'}
          </button>
          {sent ? <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">Thanks — your message is with our support team.</p> : null}
        </form>
      </div>
    </div>
  );
}
