import React from 'react';
import { Clock, FileCheck2, MapPin, MessageCircle } from 'lucide-react';
import { SiteVisitForm } from '../components/SiteVisitForm';
import { useEstate } from '../context/EstateContext';
import { buildWhatsAppUrl } from '../lib/api';

interface SiteVisitPageProps {
  preselectedPlotId?: number | null;
}

export const SiteVisitPage: React.FC<SiteVisitPageProps> = ({ preselectedPlotId }) => {
  const { plots, settings } = useEstate();

  const waUrl = buildWhatsAppUrl(
    settings.whatsappNumber,
    `Hello ${settings.companyName}, I would like to arrange a site visit this week.`
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-5 space-y-6">
          <div>
            <p className="text-xs font-mono text-[#9E7822] mb-1">Guided Inspection</p>
            <h1 className="font-display text-4xl font-semibold text-[#0B281F]">
              Book a Site Visit
            </h1>
            <p className="text-sm text-[#4B635A] mt-2 leading-relaxed">
              Experience the topography, neighborhood serenity, and road infrastructure firsthand.
              Our senior land advisor will meet you at the estate gateway with survey maps and
              title records.
            </p>
          </div>

          <div className="bg-[#F7F9F8] border border-[#E2E8E5] rounded-lg p-6 space-y-4">
            <h2 className="font-semibold text-sm text-[#0B281F]">What to Expect During Your Visit</h2>
            <div className="space-y-3 text-sm text-[#3D524A]">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-[#9E7822] shrink-0 mt-0.5" />
                <span>Physical walk-through of plot corner pillars and road widths.</span>
              </div>
              <div className="flex items-start gap-3">
                <FileCheck2 className="w-4 h-4 text-[#9E7822] shrink-0 mt-0.5" />
                <span>On-site inspection of verified freehold deeds &amp; zoning approvals.</span>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-[#9E7822] shrink-0 mt-0.5" />
                <span>Private 45–60 minute tour available 7 days a week by appointment.</span>
              </div>
            </div>

            <div className="pt-3 border-t border-[#E2E8E5]">
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs font-semibold text-[#0B281F] hover:text-[#9E7822]"
              >
                <MessageCircle className="w-4 h-4 text-[#9E7822]" />
                Prefer instant scheduling? Message us on WhatsApp
              </a>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7">
          <SiteVisitForm plots={plots} preselectedPlotId={preselectedPlotId} />
        </div>
      </div>
    </div>
  );
};
