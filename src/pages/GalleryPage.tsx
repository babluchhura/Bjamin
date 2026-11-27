import React, { useMemo, useState } from 'react';
import { ArrowUpRight, X } from 'lucide-react';
import { SmartImage } from '../components/SmartImage';
import { useEstate } from '../context/EstateContext';
import type { PlotItem } from '../types/estate';

interface GalleryPageProps {
  onSelectPlot: (plot: PlotItem) => void;
}

export const GalleryPage: React.FC<GalleryPageProps> = ({ onSelectPlot }) => {
  const { plots } = useEstate();
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [lightboxItem, setLightboxItem] = useState<{
    src: string;
    plot: PlotItem;
  } | null>(null);

  const locations = useMemo(
    () => Array.from(new Set(plots.map((p) => p.location))).sort(),
    [plots]
  );

  const galleryEntries = useMemo(() => {
    const entries: { src: string; plot: PlotItem }[] = [];
    for (const plot of plots) {
      if (selectedLocation !== 'All' && plot.location !== selectedLocation) continue;
      for (const img of plot.images || []) {
        entries.push({ src: img, plot });
      }
    }
    return entries;
  }, [plots, selectedLocation]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <p className="text-xs font-mono text-[#9E7822] mb-1">Site Photography</p>
          <h1 className="font-display text-4xl font-semibold text-[#0B281F]">Plot Gallery</h1>
          <p className="text-sm text-[#4B635A] mt-2 max-w-xl">
            Inspect road widths, stone boundary markers, landscaped boulevards, and neighborhood
            surroundings across our residential enclaves.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-[#F7F9F8] border border-[#E2E8E5] rounded-lg">
          <button
            type="button"
            onClick={() => setSelectedLocation('All')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              selectedLocation === 'All'
                ? 'bg-[#0B281F] text-white'
                : 'text-[#3D524A] hover:text-[#0B281F]'
            }`}
          >
            All Enclaves
          </button>
          {locations.map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => setSelectedLocation(loc)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                selectedLocation === loc
                  ? 'bg-[#0B281F] text-white'
                  : 'text-[#3D524A] hover:text-[#0B281F]'
              }`}
            >
              {loc}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {galleryEntries.map((entry, idx) => (
          <figure
            key={`${entry.plot.id}-${idx}`}
            className="group bg-white border border-[#E2E8E5] rounded-lg overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setLightboxItem(entry)}
              className="aspect-[4/3] w-full overflow-hidden block bg-[#F7F9F8]"
            >
              <SmartImage
                src={entry.src}
                alt={`${entry.plot.name} (${entry.plot.plotCode})`}
                fallbackTitle={entry.plot.name}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              />
            </button>
            <figcaption className="p-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-mono text-[#5B7269]">
                  {entry.plot.plotCode} · {entry.plot.location}
                </div>
                <div className="font-medium text-sm text-[#0B281F] mt-0.5">
                  {entry.plot.name}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onSelectPlot(entry.plot)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#9E7822] hover:underline whitespace-nowrap shrink-0"
              >
                Plot Details
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </figcaption>
          </figure>
        ))}
      </div>

      {lightboxItem && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative max-w-4xl w-full bg-white rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setLightboxItem(null)}
              aria-label="Close image preview"
              className="absolute top-3 right-3 z-10 w-10 h-10 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="aspect-[16/10] w-full bg-[#071E17]">
              <SmartImage
                src={lightboxItem.src}
                alt={lightboxItem.plot.name}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="p-4 flex items-center justify-between gap-4 border-t border-[#E2E8E5]">
              <div>
                <div className="text-xs font-mono text-[#5B7269]">
                  {lightboxItem.plot.plotCode} · {lightboxItem.plot.location}
                </div>
                <div className="font-semibold text-[#0B281F]">{lightboxItem.plot.name}</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const target = lightboxItem.plot;
                  setLightboxItem(null);
                  onSelectPlot(target);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#0B281F] rounded-md hover:bg-[#12382B]"
              >
                Inspect Plot Specs
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
