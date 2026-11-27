import React from 'react';
import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { InquiryForm } from '../components/InquiryForm';
import { useEstate } from '../context/EstateContext';
import { buildWhatsAppUrl } from '../lib/api';

export const ContactPage: React.FC = () => {
  const { settings, plots } = useEstate();

  const waUrl = buildWhatsAppUrl(
    settings.whatsappNumber,
    `Hello ${settings.companyName}, I would like to speak with an advisor regarding residential plots.`
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-5 space-y-6">
          <div>
            <p className="text-xs font-mono text-[#9E7822] mb-1">Direct Advisory</p>
            <h1 className="font-display text-4xl font-semibold text-[#0B281F]">Contact Us</h1>
            <p className="text-sm text-[#4B635A] mt-2 leading-relaxed">
              Reach our land advisory desk directly for parcel availability, title documents,
              payment plans, or private enclave visits.
            </p>
          </div>

          <div className="bg-[#0B281F] text-white rounded-lg p-6 space-y-5">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-[#D1AA48] shrink-0 mt-0.5" />
              <div>
                <div className="text-xs text-[#D1AA48] font-medium">Head Office</div>
                <div className="text-sm text-white/90 mt-0.5">{settings.officeAddress}</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-[#D1AA48] shrink-0 mt-0.5" />
              <div>
                <div className="text-xs text-[#D1AA48] font-medium">Telephone</div>
                <a
                  href={`tel:${settings.contactPhone}`}
                  className="text-sm text-white/90 hover:underline mt-0.5 block"
                >
                  {settings.contactPhone}
                </a>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-[#D1AA48] shrink-0 mt-0.5" />
              <div>
                <div className="text-xs text-[#D1AA48] font-medium">Email</div>
                <a
                  href={`mailto:${settings.contactEmail}`}
                  className="text-sm text-white/90 hover:underline mt-0.5 block break-all"
                >
                  {settings.contactEmail}
                </a>
              </div>
            </div>

            <div className="pt-3 border-t border-white/15">
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#071E17] bg-[#D1AA48] rounded-md hover:bg-[#B88E2F] transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                Message on WhatsApp
              </a>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7">
          <InquiryForm
            plots={plots}
            whatsappNumber={settings.whatsappNumber}
            heading="Send Us a Message"
          />
        </div>
      </div>
    </div>
  );
};
