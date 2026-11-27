import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';

export type AppPage =
  | 'home'
  | 'about'
  | 'plots'
  | 'plot-details'
  | 'gallery'
  | 'map'
  | 'site-visit'
  | 'reviews'
  | 'contact'
  | 'privacy'
  | 'terms'
  | 'admin';

interface HeaderProps {
  brandName: string;
  currentPage: AppPage;
  onNavigate: (page: AppPage) => void;
}

const PRIMARY_NAV: { label: string; page: AppPage }[] = [
  { label: 'Available Plots', page: 'plots' },
  { label: 'Plot Gallery', page: 'gallery' },
  { label: 'Location & Map', page: 'map' },
  { label: 'About Us', page: 'about' },
  { label: 'Reviews', page: 'reviews' },
];

export const Header: React.FC<HeaderProps> = ({ brandName, currentPage, onNavigate }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNav = (page: AppPage) => {
    onNavigate(page);
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-[#E2E8E5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark */}
        <button
          type="button"
          onClick={() => handleNav('home')}
          className="font-display text-2xl font-bold tracking-tight text-[#0B281F] whitespace-nowrap shrink-0 hover:text-[#9E7822] transition-colors"
        >
          {brandName}
        </button>

        {/* Zone 2: 5 concise single-line nav links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden lg:flex items-center gap-7 text-sm font-medium text-[#3D524A]"
        >
          {PRIMARY_NAV.map((item) => {
            const active =
              currentPage === item.page ||
              (item.page === 'plots' && currentPage === 'plot-details');
            return (
              <button
                key={item.page}
                type="button"
                onClick={() => handleNav(item.page)}
                className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                  active
                    ? 'text-[#0B281F] border-[#B88E2F] font-semibold'
                    : 'border-transparent hover:text-[#0B281F] hover:border-[#D4DDD8]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary CTA */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => handleNav('site-visit')}
            className="hidden sm:inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-[#0B281F] rounded-md hover:bg-[#12382B] transition-colors whitespace-nowrap shrink-0"
          >
            Book Site Visit
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-md border border-[#E2E8E5] text-[#0B281F]"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden bg-white border-b border-[#E2E8E5] px-4 py-4 space-y-1">
          {[
            { label: 'Home', page: 'home' as AppPage },
            ...PRIMARY_NAV,
            { label: 'Book Site Visit', page: 'site-visit' as AppPage },
            { label: 'Contact Us', page: 'contact' as AppPage },
            { label: 'Admin Portal', page: 'admin' as AppPage },
          ].map((item) => (
            <button
              key={item.page}
              type="button"
              onClick={() => handleNav(item.page)}
              className={`block w-full text-left px-3 py-2.5 rounded-md text-sm font-medium ${
                currentPage === item.page
                  ? 'bg-[#F7F9F8] text-[#0B281F] font-semibold'
                  : 'text-[#3D524A] hover:bg-[#F7F9F8]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
};
