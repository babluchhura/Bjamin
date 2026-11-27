import React from 'react';
import { useEstate } from '../context/EstateContext';

interface LegalPageProps {
  mode: 'privacy' | 'terms';
}

export const LegalPage: React.FC<LegalPageProps> = ({ mode }) => {
  const { settings } = useEstate();

  if (mode === 'privacy') {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-6">
        <div>
          <p className="text-xs font-mono text-[#9E7822] mb-1">Legal &amp; Compliance</p>
          <h1 className="font-display text-4xl font-semibold text-[#0B281F]">Privacy Policy</h1>
          <p className="text-xs text-[#5B7269] mt-2">
            Effective Date: November 2026 · {settings.companyName}
          </p>
        </div>

        <div className="space-y-5 text-sm sm:text-base text-[#273E36] leading-relaxed">
          <section>
            <h2 className="font-display text-2xl font-semibold text-[#0B281F] mb-2">
              1. Information We Collect
            </h2>
            <p>
              When you submit a property inquiry, schedule a site visit, or publish a customer
              review on {settings.companyName}, we collect only the contact details you provide
              (such as your name, email address, phone number, preferred tour date, and inquiry
              notes).
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-[#0B281F] mb-2">
              2. How We Use Your Information
            </h2>
            <p>
              Your contact information is used strictly to respond to plot inquiries, coordinate
              guided site tours, share requested legal survey documentation, and manage customer
              support. We never sell or rent your personal data to third-party brokers or marketing
              lists.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-[#0B281F] mb-2">
              3. Google Maps Integration &amp; Privacy
            </h2>
            <p>
              Our interactive parcel map integrates Google Maps features. Use of interactive map
              views is subject to the{' '}
              <a
                href="https://policies.google.com/privacy?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#9E7822] underline"
              >
                Google Privacy Policy
              </a>{' '}
              and{' '}
              <a
                href="https://maps.google.com/help/terms_maps/?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#9E7822] underline"
              >
                Google Maps End User Additional Terms of Service
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-[#0B281F] mb-2">
              4. Contact for Data Requests
            </h2>
            <p>
              To update or delete any inquiry or booking record, email{' '}
              <a href={`mailto:${settings.contactEmail}`} className="text-[#9E7822] underline">
                {settings.contactEmail}
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-6">
      <div>
        <p className="text-xs font-mono text-[#9E7822] mb-1">Legal &amp; Compliance</p>
        <h1 className="font-display text-4xl font-semibold text-[#0B281F]">
          Terms &amp; Conditions
        </h1>
        <p className="text-xs text-[#5B7269] mt-2">
          Effective Date: November 2026 · {settings.companyName}
        </p>
      </div>

      <div className="space-y-5 text-sm sm:text-base text-[#273E36] leading-relaxed">
        <section>
          <h2 className="font-display text-2xl font-semibold text-[#0B281F] mb-2">
            1. Property Specifications &amp; Availability
          </h2>
          <p>
            Plot areas, dimensions, road access descriptions, and prices listed on{' '}
            {settings.companyName} are maintained directly by our advisory team. Availability status
            (Available, Reserved, or Sold) updates in real time, and final parcel boundaries are
            governed by the registered survey deed executed at closing.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold text-[#0B281F] mb-2">
            2. Reservations &amp; Site Visits
          </h2>
          <p>
            Scheduling a site visit or submitting an inquiry does not constitute a binding land
            reservation until an official reservation agreement and earnest deposit receipt are
            countersigned by {settings.companyName}.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold text-[#0B281F] mb-2">
            3. Google Maps Platform Terms
          </h2>
          <p>
            This application integrates Google Maps features and content; use of Google Maps
            features is subject to the{' '}
            <a
              href="https://maps.google.com/help/terms_maps/?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#9E7822] underline"
            >
              Google Maps/Google Earth Additional Terms of Service
            </a>{' '}
            and{' '}
            <a
              href="https://policies.google.com/privacy?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#9E7822] underline"
            >
              Google Privacy Policy
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
};
