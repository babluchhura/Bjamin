import React from 'react';
import { Lock, Mail, MapPin, Phone } from 'lucide-react';
import type { SiteSettingsMap } from '../types/estate';
import type { AppPage } from './Header';

interface FooterProps {
  settings: SiteSettingsMap;
  onNavigate: (page: AppPage) => void;
}

export const Footer: React.FC<FooterProps> = ({ settings, onNavigate }) => {
  return (
    <footer className="bg-[#0B281F] text-white/90 border-t border-[#12382B]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="font-display text-3xl font-semibold text-white tracking-tight text-left"
            >
              {settings.companyName}
            </button>
            <p className="text-sm text-white/75 leading-relaxed max-w-xs">
              {settings.tagline}
            </p>
            <div className="flex items-center gap-4 pt-2 text-xs text-[#D1AA48]">
              {settings.socialFacebook && (
                <a
                  href={settings.socialFacebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  Facebook
                </a>
              )}
              {settings.socialInstagram && (
                <a
                  href={settings.socialInstagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  Instagram
                </a>
              )}
              {settings.socialLinkedIn && (
                <a
                  href={settings.socialLinkedIn}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  LinkedIn
                </a>
              )}
              {settings.socialYoutube && (
                <a
                  href={settings.socialYoutube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  YouTube
                </a>
              )}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold tracking-wider text-[#D1AA48] mb-4">
              Explore Estates
            </h4>
            <ul className="space-y-2.5 text-sm text-white/80">
              {[
                { label: 'Home', page: 'home' as AppPage },
                { label: 'Available Plots', page: 'plots' as AppPage },
                { label: 'Plot Gallery', page: 'gallery' as AppPage },
                { label: 'Location & Map', page: 'map' as AppPage },
                { label: 'Book Site Visit', page: 'site-visit' as AppPage },
              ].map((link) => (
                <li key={link.page}>
                  <button
                    type="button"
                    onClick={() => onNavigate(link.page)}
                    className="hover:text-white transition-colors"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold tracking-wider text-[#D1AA48] mb-4">
              Company & Legal
            </h4>
            <ul className="space-y-2.5 text-sm text-white/80">
              {[
                { label: 'About Us', page: 'about' as AppPage },
                { label: 'Customer Reviews', page: 'reviews' as AppPage },
                { label: 'Contact Us', page: 'contact' as AppPage },
                { label: 'Privacy Policy', page: 'privacy' as AppPage },
                { label: 'Terms & Conditions', page: 'terms' as AppPage },
              ].map((link) => (
                <li key={link.page}>
                  <button
                    type="button"
                    onClick={() => onNavigate(link.page)}
                    className="hover:text-white transition-colors"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('admin')}
                  className="inline-flex items-center gap-1.5 text-[#D1AA48] hover:text-white transition-colors pt-1"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Admin Portal
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold tracking-wider text-[#D1AA48] mb-4">
              Sales & Advisory Office
            </h4>
            <ul className="space-y-3 text-sm text-white/80">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#D1AA48] shrink-0 mt-0.5" />
                <span>{settings.officeAddress}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-[#D1AA48] shrink-0" />
                <a href={`tel:${settings.contactPhone}`} className="hover:text-white">
                  {settings.contactPhone}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-[#D1AA48] shrink-0" />
                <a href={`mailto:${settings.contactEmail}`} className="hover:text-white break-all">
                  {settings.contactEmail}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/15 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/65">
          <p>
            &copy; {new Date().getFullYear()} {settings.companyName}. All rights reserved.
          </p>
          <p>Clear-title residential land development &amp; parcel advisory.</p>
        </div>
      </div>
    </footer>
  );
};
