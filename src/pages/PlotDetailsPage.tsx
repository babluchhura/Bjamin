import React, { useState } from 'react';
import {
  ArrowLeft,
  CalendarCheck,
  Check,
  ExternalLink,
  MessageCircle,
} from 'lucide-react';
import { InquiryForm } from '../components/InquiryForm';
import { PlotsMap } from '../components/PlotsMap';
import { SmartImage } from '../components/SmartImage';
import { useEstate } from '../context/EstateContext';
import { buildWhatsAppUrl, formatCurrency, formatHectares } from '../lib/api';
import type { PlotItem } from '../types/estate';

interface PlotDetailsPageProps {
  plot: PlotItem;
  onBack: () => void;
  onBookVisit: (plot: PlotItem) => void;
}

export const PlotDetailsPage: React.FC<PlotDetailsPageProps> = ({
  plot,
  onBack,
  onBookVisit,
}) => {
  const { settings, googleMapsApiKey } = useEstate();
  const images =
    plot.images && plot.images.length > 0
      ? plot.images
      : ['/src/assets/images/plot_valley_meadow_1795758692675.jpg'];
  const [activeImage, setActiveImage] = useState(0);

  const waUrl = buildWhatsAppUrl(
    settings.whatsappNumber,
    `Hello ${settings.companyName}, I would like complete details and title documents for Plot ${plot.plotCode} (${plot.name}, ${plot.location}).`
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-medium text-[#3D524A] hover:text-[#0B281F] mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Available Plots
      </button>

      {/* Top Grid: Photo Gallery + Primary Specifications */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 space-y-3">
          <div className="aspect-[4/3] w-full rounded-lg overflow-hidden border border-[#E2E8E5] bg-[#F7F9F8]">
            <SmartImage
              src={images[activeImage] || images[0]}
              alt={`${plot.name} — view ${activeImage + 1}`}
              fallbackTitle={plot.name}
              className="w-full h-full object-cover"
            />
          </div>

          {images.length > 1 && (
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
              {images.map((img, idx) => (
                <button
                  key={`${img}-${idx}`}
                  type="button"
                  onClick={() => setActiveImage(idx)}
                  className={`aspect-[4/3] rounded-md overflow-hidden border-2 transition-colors ${
                    activeImage === idx
                      ? 'border-[#B88E2F]'
                      : 'border-transparent opacity-75 hover:opacity-100'
                  }`}
                >
                  <SmartImage
                    src={img}
                    alt={`${plot.name} thumbnail ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-5 bg-white border border-[#E2E8E5] rounded-lg p-6 lg:p-7 space-y-5">
          <div>
            <div className="flex items-center justify-between gap-4 text-xs font-mono text-[#5B7269] mb-2">
              <span>
                {plot.plotCode} · {plot.location}
              </span>
              <span
                className={`px-2.5 py-0.5 font-sans font-semibold rounded border ${
                  plot.status === 'Available'
                    ? 'bg-[#0B281F] text-white border-[#0B281F]'
                    : plot.status === 'Reserved'
                    ? 'bg-[#FBF7EB] text-[#7A5912] border-[#D1AA48]'
                    : 'bg-neutral-100 text-neutral-700 border-neutral-300'
                }`}
              >
                {plot.status}
              </span>
            </div>

            <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#0B281F]">
              {plot.name}
            </h1>
          </div>

          <div className="flex items-baseline justify-between gap-4 py-4 border-y border-[#E2E8E5]">
            <div>
              <div className="text-xs text-[#5B7269]">Total Plot Price</div>
              <div className="text-3xl font-semibold text-[#0B281F] tabular-nums">
                {formatCurrency(plot.price, settings.currencySymbol)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-[#5B7269]">Price Per Decimal</div>
              <div className="text-lg font-medium text-[#9E7822] tabular-nums">
                {formatCurrency(plot.pricePerDecimal, settings.currencySymbol)}
              </div>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs text-[#5B7269]">Plot ID</dt>
              <dd className="font-mono font-medium text-[#10241D] mt-0.5">{plot.plotCode}</dd>
            </div>
            <div>
              <dt className="text-xs text-[#5B7269]">Area (Decimals &amp; Hectares)</dt>
              <dd className="font-medium text-[#10241D] mt-0.5 tabular-nums">
                {plot.areaDecimals} Dec ({formatHectares(plot.areaDecimals)})
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[#5B7269]">Plot Dimensions</dt>
              <dd className="font-mono font-medium text-[#10241D] mt-0.5 tabular-nums">
                {plot.dimensions}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[#5B7269]">Road Access</dt>
              <dd className="font-medium text-[#10241D] mt-0.5">{plot.roadAccess}</dd>
            </div>
          </dl>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={() => onBookVisit(plot)}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-[#0B281F] rounded-md hover:bg-[#12382B] transition-colors"
            >
              <CalendarCheck className="w-4 h-4" />
              Book Site Visit
            </button>

            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-[#0B281F] bg-[#FBF7EB] border border-[#D1AA48] rounded-md hover:bg-[#F5ECCD] transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              Contact on WhatsApp
            </a>
          </div>

          <a
            href={plot.googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#9E7822] hover:underline"
          >
            Open Pin in Google Maps
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Description, Highlights & Contact Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-12">
        <div className="lg:col-span-7 space-y-8">
          <section className="bg-white border border-[#E2E8E5] rounded-lg p-6">
            <h2 className="font-display text-2xl font-semibold text-[#0B281F] mb-3">
              Property Overview
            </h2>
            <p className="text-sm sm:text-base text-[#273E36] leading-relaxed">
              {plot.description}
            </p>

            {plot.highlights && plot.highlights.length > 0 && (
              <div className="mt-6 pt-5 border-t border-[#E2E8E5]">
                <h3 className="text-xs font-semibold tracking-wider text-[#5B7269] mb-3">
                  Parcel Infrastructure &amp; Title Highlights
                </h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {plot.highlights.map((hl, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-[#10241D]">
                      <Check className="w-4 h-4 text-[#9E7822] shrink-0 mt-0.5" />
                      <span>{hl}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section>
            <div className="flex items-center justify-between gap-4 mb-3">
              <h2 className="font-display text-2xl font-semibold text-[#0B281F]">
                Google Maps Location
              </h2>
              <span className="text-xs font-mono text-[#5B7269] tabular-nums">
                {plot.latitude.toFixed(4)}, {plot.longitude.toFixed(4)}
              </span>
            </div>
            <PlotsMap
              apiKey={googleMapsApiKey}
              plots={[plot]}
              currencySymbol={settings.currencySymbol}
              selectedPlotId={plot.id}
              heightClass="h-[360px]"
            />
          </section>
        </div>

        <div className="lg:col-span-5">
          <InquiryForm
            plot={plot}
            whatsappNumber={settings.whatsappNumber}
            heading={`Contact for ${plot.plotCode} Details`}
          />
        </div>
      </div>
    </div>
  );
};
