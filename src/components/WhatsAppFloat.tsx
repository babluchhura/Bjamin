import React from 'react';
import { MessageCircle } from 'lucide-react';
import { buildWhatsAppUrl } from '../lib/api';

interface WhatsAppFloatProps {
  whatsappNumber: string;
  companyName: string;
}

export const WhatsAppFloat: React.FC<WhatsAppFloatProps> = ({
  whatsappNumber,
  companyName,
}) => {
  const url = buildWhatsAppUrl(
    whatsappNumber,
    `Hello ${companyName}, I would like to inquire about available residential plots.`
  );

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 px-4 py-3 rounded-full bg-[#0B281F] text-white border border-[#B88E2F] shadow-lg hover:bg-[#12382B] transition-transform duration-150 hover:scale-[1.03]"
    >
      <MessageCircle className="w-5 h-5 text-[#D1AA48]" />
      <span className="text-xs font-semibold whitespace-nowrap hidden sm:inline">
        WhatsApp Advisor
      </span>
    </a>
  );
};
