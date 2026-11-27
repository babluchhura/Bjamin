import React from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { SmartImage } from '../components/SmartImage';
import { useEstate } from '../context/EstateContext';
import type { AppPage } from '../components/Header';

interface AboutPageProps {
  onNavigate: (page: AppPage) => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ onNavigate }) => {
  const { settings, plots } = useEstate();

  const availableCount = plots.filter((p) => p.status === 'Available').length;

  return (
    <div>
      <section className="bg-[#0B281F] text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6 space-y-4">
            <p className="text-xs font-mono text-[#D1AA48]">Our Heritage &amp; Practice</p>
            <h1 className="font-display text-4xl sm:text-5xl font-semibold text-white leading-tight">
              {settings.aboutTitle}
            </h1>
            <p className="text-base text-white/80 leading-relaxed">{settings.aboutBody}</p>
            <div className="pt-2 flex flex-wrap gap-4">
              <button
                type="button"
                onClick={() => onNavigate('plots')}
                className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-[#071E17] bg-[#D1AA48] rounded-md hover:bg-[#B88E2F] transition-colors"
              >
                View {availableCount} Available Plots
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('site-visit')}
                className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white border border-white/25 rounded-md hover:bg-white/10 transition-colors"
              >
                Book Site Visit
              </button>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="aspect-[4/3] rounded-lg overflow-hidden border border-white/15">
              <SmartImage
                src="/src/assets/images/plot_highway_corridor_1795758693036.jpg"
                alt="Bolangir Jamin landscaped township boulevard entrance"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="border border-[#E2E8E5] rounded-lg p-6">
            <div className="font-mono text-2xl font-semibold text-[#0B281F] tabular-nums mb-2">
              100%
            </div>
            <h2 className="font-display text-xl font-semibold text-[#0B281F] mb-2">
              Independent Title Verification
            </h2>
            <p className="text-sm text-[#4B635A] leading-relaxed">
              Every enclave undergoes multi-decade land title tracing, tax-clearance audits, and
              zoning compliance checks before a single parcel is offered.
            </p>
          </div>

          <div className="border border-[#E2E8E5] rounded-lg p-6">
            <div className="font-mono text-2xl font-semibold text-[#0B281F] tabular-nums mb-2">
              30–60 ft
            </div>
            <h2 className="font-display text-xl font-semibold text-[#0B281F] mb-2">
              Infrastructure First
            </h2>
            <p className="text-sm text-[#4B635A] leading-relaxed">
              Paved roads, storm drains, avenue trees, and utility ducts are built upfront so
              families can begin designing their homes immediately after registration.
            </p>
          </div>

          <div className="border border-[#E2E8E5] rounded-lg p-6">
            <div className="font-mono text-2xl font-semibold text-[#0B281F] tabular-nums mb-2">
              14 Days
            </div>
            <h2 className="font-display text-xl font-semibold text-[#0B281F] mb-2">
              Transparent Closing
            </h2>
            <p className="text-sm text-[#4B635A] leading-relaxed">
              Direct developer agreements with itemized per-decimal pricing, no hidden legal
              surcharges, and dedicated guidance through municipal deed registration.
            </p>
          </div>
        </div>

        <div className="mt-12 bg-[#F7F9F8] border border-[#E2E8E5] rounded-lg p-8">
          <h2 className="font-display text-3xl font-semibold text-[#0B281F] mb-4">
            What Every Parcel Handover Includes
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-[#10241D]">
            {[
              'Registered freehold sale deed & title extract',
              'Stamped boundary survey & dimension blueprint',
              'Permanent corner boundary stones on site',
              'Municipal water & underground power stub',
              'Soil bearing & contour elevation summary',
              'Dedicated post-sale architectural support',
            ].map((item) => (
              <div key={item} className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-[#9E7822] shrink-0 mt-0.5" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
