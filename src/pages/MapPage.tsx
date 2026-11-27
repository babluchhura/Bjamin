import React, { useState } from 'react';
import { ExternalLink, MapPin } from 'lucide-react';
import { PlotsMap } from '../components/PlotsMap';
import { useEstate } from '../context/EstateContext';
import { formatCurrency } from '../lib/api';
import type { PlotItem } from '../types/estate';

interface MapPageProps {
  onSelectPlot: (plot: PlotItem) => void;
}

export const MapPage: React.FC<MapPageProps> = ({ onSelectPlot }) => {
  const { plots, settings, googleMapsApiKey } = useEstate();
  const [selectedId, setSelectedId] = useState<number | null>(plots[0]?.id ?? null);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <p className="text-xs font-mono text-[#9E7822] mb-1">Geographic Overview</p>
        <h1 className="font-display text-4xl font-semibold text-[#0B281F]">
          Location &amp; Interactive Map
        </h1>
        <p className="text-sm text-[#4B635A] mt-2 max-w-2xl">
          Explore the exact coordinates of each residential plot across our enclaves. Click any map
          marker to inspect parcel pricing and open turn-by-turn directions.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8">
          <PlotsMap
            apiKey={googleMapsApiKey}
            plots={plots}
            currencySymbol={settings.currencySymbol}
            selectedPlotId={selectedId}
            heightClass="h-[460px] lg:h-[580px]"
            onSelectPlot={onSelectPlot}
          />
        </div>

        <div className="lg:col-span-4 bg-white border border-[#E2E8E5] rounded-lg divide-y divide-[#E2E8E5] max-h-[580px] overflow-y-auto">
          <div className="p-4 bg-[#F7F9F8]">
            <h2 className="font-semibold text-sm text-[#0B281F]">
              All Surveyed Parcels ({plots.length})
            </h2>
            <p className="text-xs text-[#5B7269] mt-0.5">
              Select a parcel to highlight or open full specs
            </p>
          </div>
          {plots.map((plot) => (
            <div
              key={plot.id}
              className={`p-4 transition-colors ${
                selectedId === plot.id ? 'bg-[#FBF7EB]/60' : 'hover:bg-[#F7F9F8]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedId(plot.id)}
                  className="text-left flex-1"
                >
                  <div className="text-xs font-mono text-[#5B7269]">
                    {plot.plotCode} · {plot.status}
                  </div>
                  <div className="font-semibold text-sm text-[#0B281F] mt-0.5">
                    {plot.name}
                  </div>
                  <div className="text-xs text-[#4B635A] flex items-center gap-1 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-[#9E7822]" />
                    {plot.location}
                  </div>
                </button>
                <div className="text-right shrink-0">
                  <div className="text-sm font-semibold text-[#0B281F] tabular-nums">
                    {formatCurrency(plot.price, settings.currencySymbol)}
                  </div>
                  <div className="text-[11px] text-[#5B7269] tabular-nums">
                    {plot.areaDecimals} Decimals
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 mt-3 pt-2 border-t border-[#E2E8E5]/70 text-xs">
                <button
                  type="button"
                  onClick={() => onSelectPlot(plot)}
                  className="font-semibold text-[#0B281F] hover:text-[#9E7822]"
                >
                  View Details
                </button>
                <a
                  href={plot.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[#9E7822] hover:underline"
                >
                  Google Maps
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
