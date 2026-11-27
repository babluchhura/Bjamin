import React, { useMemo, useState } from 'react';
import { ArrowRight, MessageCircle, Search } from 'lucide-react';
import { PlotCard } from '../components/PlotCard';
import { SmartImage } from '../components/SmartImage';
import { useEstate } from '../context/EstateContext';
import { buildWhatsAppUrl } from '../lib/api';
import type { PlotFilters, PlotItem } from '../types/estate';
import type { AppPage } from '../components/Header';

interface HomePageProps {
  onNavigate: (page: AppPage) => void;
  onSelectPlot: (plot: PlotItem) => void;
  onBookVisit: (plot?: PlotItem) => void;
  onApplySearch: (filters: PlotFilters) => void;
}

const PILLARS = [
  {
    num: '01',
    title: 'Clear Freehold Title & Survey',
    body: 'Every parcel includes an independent legal chain-of-title dossier, registered municipal survey map, and permanent stone boundary pillars installed prior to sale.',
    metric: '100% Clear-Title Guarantee',
  },
  {
    num: '02',
    title: 'Wide Paved Concrete Boulevards',
    body: 'Internal avenues range from 30 ft cul-de-sacs to 60 ft divided township boulevards with storm-water drainage and pedestrian sidewalks.',
    metric: '30–60 ft Road Frontage',
  },
  {
    num: '03',
    title: 'Ready Underground Utilities',
    body: 'Municipal water stubs, underground electrical conduits, and fiber-optic ducting are brought directly to each plot boundary before handover.',
    metric: 'Zero Post-Purchase Delays',
  },
  {
    num: '04',
    title: 'Direct Developer Pricing',
    body: 'Purchase directly from Bolangir Jamin with transparent per-decimal pricing, no brokerage markups, and milestone-aligned registration.',
    metric: '14-Day Standard Closing',
  },
];

export const HomePage: React.FC<HomePageProps> = ({
  onNavigate,
  onSelectPlot,
  onBookVisit,
  onApplySearch,
}) => {
  const { settings, plots, reviews, loading } = useEstate();
  const [searchLocation, setSearchLocation] = useState('All');
  const [searchBudget, setSearchBudget] = useState('');
  const [searchSize, setSearchSize] = useState('');

  const locations = useMemo(
    () => Array.from(new Set(plots.map((p) => p.location))).sort(),
    [plots]
  );

  const featuredPlots = useMemo(
    () => plots.filter((p) => p.featured).slice(0, 3),
    [plots]
  );

  const latestAvailable = useMemo(
    () => plots.filter((p) => p.status === 'Available').slice(0, 3),
    [plots]
  );

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const isMinBudget = searchBudget === 'min:10000000';
    onApplySearch({
      location: searchLocation,
      minPrice: isMinBudget ? '10000000' : undefined,
      maxPrice: isMinBudget || !searchBudget ? undefined : searchBudget,
      minSize: searchSize || undefined,
    });
  };

  const whatsappHeroUrl = buildWhatsAppUrl(
    settings.whatsappNumber,
    `Hello ${settings.companyName}, I would like to explore your available residential plots.`
  );

  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-[#071E17] text-white overflow-hidden">
        <div className="absolute inset-0">
          <SmartImage
            src={settings.heroImage}
            alt="Aerial view of manicured Bolangir Jamin residential land plots"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#071E17]/92 via-[#071E17]/75 to-[#071E17]/35" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="max-w-2xl">
            <p className="text-xs font-mono tracking-wider text-[#D1AA48] mb-3">
              Surveyed Residential Land · Clear Freehold Titles
            </p>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.08] text-white">
              {settings.heroHeadline}
            </h1>
            <p className="mt-5 text-base sm:text-lg text-white/85 leading-relaxed max-w-xl">
              {settings.heroSubheadline}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => onNavigate('plots')}
                className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-semibold text-[#071E17] bg-[#D1AA48] rounded-md hover:bg-[#B88E2F] transition-colors whitespace-nowrap"
              >
                Explore Available Plots
                <ArrowRight className="w-4 h-4" />
              </button>

              <a
                href={whatsappHeroUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3.5 text-sm font-semibold text-white bg-white/10 backdrop-blur border border-white/25 rounded-md hover:bg-white/20 transition-colors whitespace-nowrap"
              >
                <MessageCircle className="w-4 h-4 text-[#D1AA48]" />
                Chat on WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Search Bar Strip */}
      <section className="bg-[#F7F9F8] border-b border-[#E2E8E5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <form
            onSubmit={handleHeroSearch}
            className="bg-white border border-[#E2E8E5] rounded-lg p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end"
          >
            <div>
              <label className="block text-xs font-medium text-[#3D524A] mb-1.5">
                Location / District
              </label>
              <select
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-white border border-[#D4DDD8] rounded-md text-[#10241D]"
              >
                <option value="All">All Locations (Odisha)</option>
                {locations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#3D524A] mb-1.5">
                Budget ({settings.currencySymbol})
              </label>
              <select
                value={searchBudget}
                onChange={(e) => setSearchBudget(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-white border border-[#D4DDD8] rounded-md text-[#10241D]"
              >
                <option value="">Any Budget (All Prices)</option>
                <option value="1000000">Up to {settings.currencySymbol}10,00,000</option>
                <option value="2000000">Up to {settings.currencySymbol}20,00,000</option>
                <option value="3500000">Up to {settings.currencySymbol}35,00,000</option>
                <option value="7500000">Up to {settings.currencySymbol}75,00,000</option>
                <option value="15000000">Up to {settings.currencySymbol}1,50,00,000</option>
                <option value="min:10000000">Above {settings.currencySymbol}1,00,00,000</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#3D524A] mb-1.5">
                Plot Size (Decimals / Hectares)
              </label>
              <select
                value={searchSize}
                onChange={(e) => setSearchSize(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-white border border-[#D4DDD8] rounded-md text-[#10241D]"
              >
                <option value="">Any Size (All Decimals &amp; Hectares)</option>
                <option value="3">3+ Decimals (0.012+ Ha)</option>
                <option value="5">5+ Decimals (0.020+ Ha)</option>
                <option value="10">10+ Decimals (0.040+ Ha)</option>
                <option value="25">25+ Decimals (0.10+ Ha)</option>
                <option value="100">100+ Decimals (0.40+ Ha)</option>
                <option value="247">247+ Decimals (1.00+ Hectare)</option>
              </select>
            </div>

            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 h-[42px] text-sm font-semibold text-white bg-[#0B281F] rounded-md hover:bg-[#12382B] transition-colors"
            >
              <Search className="w-4 h-4" />
              Search Plots
            </button>
          </form>
        </div>
      </section>

      {/* Featured Properties */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-mono text-[#9E7822] mb-1">Curated Release</p>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#0B281F]">
              Featured Residential Plots
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('plots')}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0B281F] hover:text-[#9E7822] transition-colors self-start sm:self-auto"
          >
            View All Plots
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-[420px] rounded-lg border border-[#E2E8E5] bg-[#F7F9F8] animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredPlots.map((plot) => (
              <PlotCard
                key={plot.id}
                plot={plot}
                currencySymbol={settings.currencySymbol}
                whatsappNumber={settings.whatsappNumber}
                onSelectPlot={onSelectPlot}
                onBookVisit={(p) => onBookVisit(p)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Why Choose Us */}
      <section className="bg-[#0B281F] text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-10">
            <p className="text-xs font-mono text-[#D1AA48] mb-2">Development Standards</p>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-white">
              Why Families &amp; Builders Choose {settings.companyName}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {PILLARS.map((item) => (
              <div
                key={item.num}
                className="bg-[#12382B] border border-white/10 rounded-lg p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-4 mb-3">
                    <span className="font-mono text-sm text-[#D1AA48] tabular-nums">
                      {item.num}.
                    </span>
                    <span className="text-xs text-white/75">{item.metric}</span>
                  </div>
                  <h3 className="font-display text-2xl font-semibold text-white mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-white/80 leading-relaxed">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Latest Available Plots */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-mono text-[#9E7822] mb-1">Immediate Possession</p>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#0B281F]">
              Latest Available Plots
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('map')}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0B281F] hover:text-[#9E7822] transition-colors self-start sm:self-auto"
          >
            Inspect on Live Map
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {latestAvailable.map((plot) => (
            <PlotCard
              key={plot.id}
              plot={plot}
              currencySymbol={settings.currencySymbol}
              whatsappNumber={settings.whatsappNumber}
              onSelectPlot={onSelectPlot}
              onBookVisit={(p) => onBookVisit(p)}
            />
          ))}
        </div>
      </section>

      {/* Customer Testimonials */}
      <section className="bg-[#F7F9F8] border-t border-[#E2E8E5] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <p className="text-xs font-mono text-[#9E7822] mb-1">Verified Landowners</p>
              <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#0B281F]">
                Homeowner &amp; Investor Testimonials
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('reviews')}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0B281F] hover:text-[#9E7822] transition-colors"
            >
              Read All Reviews
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reviews.slice(0, 4).map((rev) => (
              <blockquote
                key={rev.id}
                className="bg-white border border-[#E2E8E5] rounded-lg p-6 flex flex-col justify-between"
              >
                <p className="text-sm sm:text-base text-[#273E36] leading-relaxed mb-5">
                  &ldquo;{rev.comment}&rdquo;
                </p>
                <footer className="pt-4 border-t border-[#E2E8E5] flex items-center justify-between gap-4">
                  <div>
                    <div className="font-semibold text-sm text-[#0B281F]">
                      {rev.customerName}
                    </div>
                    <div className="text-xs text-[#5B7269]">{rev.customerRole}</div>
                  </div>
                  <div className="text-xs font-mono text-[#9E7822] tabular-nums shrink-0">
                    {rev.rating}.0 / 5.0
                  </div>
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
