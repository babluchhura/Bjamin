import React from 'react';
import { ArrowUpRight, MessageCircle } from 'lucide-react';
import { buildWhatsAppUrl, formatCurrency, formatHectares } from '../lib/api';
import type { PlotItem } from '../types/estate';
import { SmartImage } from './SmartImage';

interface PlotCardProps {
  plot: PlotItem;
  currencySymbol: string;
  whatsappNumber: string;
  onSelectPlot: (plot: PlotItem) => void;
  onBookVisit: (plot: PlotItem) => void;
}

const STATUS_STYLE: Record<string, string> = {
  Available: 'bg-[#0B281F] text-white border-[#0B281F]',
  Reserved: 'bg-[#FBF7EB] text-[#7A5912] border-[#D1AA48]',
  Sold: 'bg-neutral-100 text-neutral-700 border-neutral-300',
};

export const PlotCard: React.FC<PlotCardProps> = ({
  plot,
  currencySymbol,
  whatsappNumber,
  onSelectPlot,
  onBookVisit,
}) => {
  const coverImage = plot.images?.[0] || '/src/assets/images/plot_valley_meadow_1795758692675.jpg';
  const waUrl = buildWhatsAppUrl(
    whatsappNumber,
    `Hello, I am interested in ${plot.plotCode} (${plot.name}) located at ${plot.location}. Please share full layout and title details.`
  );

  return (
    <article className="group bg-white border border-[#E2E8E5] rounded-lg overflow-hidden flex flex-col transition-colors duration-150 hover:border-[#0B281F]/40">
      <button
        type="button"
        onClick={() => onSelectPlot(plot)}
        className="relative aspect-[4/3] w-full overflow-hidden text-left block bg-[#F7F9F8]"
      >
        <SmartImage
          src={coverImage}
          alt={`${plot.name} residential land plot in ${plot.location}`}
          fallbackTitle={plot.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
        <div
          className={`absolute top-3 left-3 px-2.5 py-1 text-xs font-medium rounded border ${
            STATUS_STYLE[plot.status] || STATUS_STYLE.Available
          }`}
        >
          {plot.status}
        </div>
      </button>

      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-center gap-2 text-xs text-[#4B635A] font-mono tabular-nums mb-1.5">
          <span>{plot.plotCode}</span>
          <span aria-hidden="true">·</span>
          <span className="truncate font-sans">{plot.location}</span>
        </div>

        <h3 className="font-display text-2xl font-semibold text-[#0B281F] leading-snug mb-3">
          <button
            type="button"
            onClick={() => onSelectPlot(plot)}
            className="text-left hover:text-[#9E7822] transition-colors"
          >
            {plot.name}
          </button>
        </h3>

        <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 py-3 border-y border-[#E2E8E5] text-sm mb-4">
          <div>
            <div className="text-[11px] text-[#5B7269]">Area (Dec / Ha)</div>
            <div className="font-medium text-[#10241D] tabular-nums text-xs sm:text-sm">
              {plot.areaDecimals} Dec · {formatHectares(plot.areaDecimals)}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-[#5B7269]">Dimensions</div>
            <div className="font-medium text-[#10241D] font-mono text-xs pt-0.5 tabular-nums">
              {plot.dimensions}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-[#5B7269]">Road Access</div>
            <div className="font-medium text-[#10241D] truncate" title={plot.roadAccess}>
              {plot.roadAccess}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-[#5B7269]">Per Decimal</div>
            <div className="font-medium text-[#10241D] tabular-nums">
              {formatCurrency(plot.pricePerDecimal, currencySymbol)}
            </div>
          </div>
        </div>

        <div className="mt-auto flex items-end justify-between gap-3">
          <div>
            <div className="text-[11px] text-[#5B7269]">Total Price</div>
            <div className="text-xl font-semibold text-[#0B281F] tabular-nums">
              {formatCurrency(plot.price, currencySymbol)}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Contact on WhatsApp about ${plot.plotCode}`}
              className="inline-flex items-center justify-center w-10 h-10 rounded-md border border-[#D4DDD8] text-[#0B281F] hover:bg-[#F7F9F8] transition-colors"
              title="Contact on WhatsApp"
            >
              <MessageCircle className="w-4 h-4" />
            </a>
            <button
              type="button"
              onClick={() => onBookVisit(plot)}
              className="px-3 py-2 text-xs font-medium text-[#0B281F] border border-[#D4DDD8] rounded-md hover:bg-[#F7F9F8] transition-colors whitespace-nowrap shrink-0"
            >
              Book Visit
            </button>
            <button
              type="button"
              onClick={() => onSelectPlot(plot)}
              className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-semibold text-white bg-[#0B281F] rounded-md hover:bg-[#12382B] transition-colors whitespace-nowrap shrink-0"
            >
              Details
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};
