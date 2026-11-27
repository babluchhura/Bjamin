import { MessageCircle } from 'lucide-react';
import { useSite } from '../lib/site';

export default function WhatsAppFloat() {
  const { settings } = useSite();
  const digits = (settings.whatsappNumber || '').replace(/\D/g, '') || '919090909090';
  const text = encodeURIComponent(`Hi ${settings.brandName}, I need help with a bus booking.`);

  return (
    <a
      href={`https://wa.me/${digits}?text=${text}`}
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-sm font-bold text-white shadow-xl shadow-emerald-900/25 transition hover:brightness-105"
      aria-label="Chat with us on WhatsApp"
    >
      <MessageCircle className="size-5" />
      <span className="hidden sm:inline">WhatsApp</span>
    </a>
  );
}
