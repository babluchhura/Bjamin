import React, { useCallback, useState } from 'react';
import {
  APILoadingStatus,
  APIProvider,
  AdvancedMarker,
  InfoWindow,
  Map as GoogleMap,
  Pin,
  useAdvancedMarkerRef,
  useApiLoadingStatus,
} from '@vis.gl/react-google-maps';
import { ExternalLink, MapPin } from 'lucide-react';
import { formatCurrency } from '../lib/api';
import type { PlotItem } from '../types/estate';

interface PlotsMapProps {
  apiKey: string;
  plots: PlotItem[];
  currencySymbol: string;
  selectedPlotId?: number | null;
  heightClass?: string;
  onSelectPlot?: (plot: PlotItem) => void;
}

const PlotMarker: React.FC<{
  plot: PlotItem;
  currencySymbol: string;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onSelectPlot?: (plot: PlotItem) => void;
}> = ({ plot, currencySymbol, isOpen, onToggle, onClose, onSelectPlot }) => {
  const [markerRef, marker] = useAdvancedMarkerRef();

  const pinColors =
    plot.status === 'Available'
      ? { background: '#0B281F', borderColor: '#B88E2F', glyphColor: '#FBF7EB' }
      : plot.status === 'Reserved'
      ? { background: '#B88E2F', borderColor: '#0B281F', glyphColor: '#FFFFFF' }
      : { background: '#64748B', borderColor: '#334155', glyphColor: '#FFFFFF' };

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={{ lat: plot.latitude, lng: plot.longitude }}
        onClick={onToggle}
        title={`${plot.plotCode} - ${plot.name}`}
      >
        <Pin
          background={pinColors.background}
          borderColor={pinColors.borderColor}
          glyphColor={pinColors.glyphColor}
          scale={1.15}
        />
      </AdvancedMarker>

      {isOpen && marker && (
        <InfoWindow anchor={marker} onCloseClick={onClose} maxWidth={260}>
          <div className="p-1 text-[#10241D] font-sans">
            <div className="text-[11px] font-mono text-[#5B7269] mb-0.5">
              {plot.plotCode} · {plot.status}
            </div>
            <div className="font-semibold text-sm text-[#0B281F] mb-1">{plot.name}</div>
            <div className="text-xs text-[#3D524A] mb-2">
              {plot.areaDecimals} Decimals · {formatCurrency(plot.price, currencySymbol)}
            </div>
            <div className="flex items-center gap-2 pt-1">
              {onSelectPlot && (
                <button
                  type="button"
                  onClick={() => onSelectPlot(plot)}
                  className="px-2.5 py-1.5 text-xs font-medium bg-[#0B281F] text-white rounded hover:bg-[#12382B]"
                >
                  View Plot
                </button>
              )}
              <a
                href={plot.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-[#9E7822] hover:underline"
              >
                Directions
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
};

const InnerMapCanvas: React.FC<{
  plots: PlotItem[];
  currencySymbol: string;
  selectedPlotId?: number | null;
  heightClass: string;
  onSelectPlot?: (plot: PlotItem) => void;
}> = ({ plots, currencySymbol, selectedPlotId, heightClass, onSelectPlot }) => {
  const status = useApiLoadingStatus();
  const [openPlotId, setOpenPlotId] = useState<number | null>(selectedPlotId ?? null);

  const handleClose = useCallback(() => setOpenPlotId(null), []);

  const validPlots = plots.filter(
    (p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude)
  );
  const focusPlot =
    validPlots.find((p) => p.id === selectedPlotId) || validPlots[0] || null;
  const defaultCenter = focusPlot
    ? { lat: focusPlot.latitude, lng: focusPlot.longitude }
    : { lat: 20.92, lng: 83.18 };

  if (status === APILoadingStatus.FAILED || status === APILoadingStatus.AUTH_FAILURE) {
    return (
      <div
        className={`${heightClass} w-full rounded-lg border border-[#E2E8E5] bg-[#F7F9F8] flex flex-col items-center justify-center p-6 text-center`}
      >
        <MapPin className="w-7 h-7 text-[#9E7822] mb-2" />
        <p className="text-sm font-medium text-[#0B281F]">
          Interactive map preview is temporarily unavailable.
        </p>
        <p className="text-xs text-[#4B635A] mt-1 max-w-md">
          You can still open any plot parcel directly in Google Maps using the parcel cards or
          direction links below.
        </p>
      </div>
    );
  }

  return (
    <div className={`${heightClass} w-full rounded-lg overflow-hidden border border-[#E2E8E5]`}>
      <GoogleMap
        mapId="DEMO_MAP_ID"
        defaultCenter={defaultCenter}
        defaultZoom={selectedPlotId ? 14 : 9}
        gestureHandling="cooperative"
        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        style={{ width: '100%', height: '100%' }}
      >
        {validPlots.map((plot) => (
          <PlotMarker
            key={plot.id}
            plot={plot}
            currencySymbol={currencySymbol}
            isOpen={openPlotId === plot.id}
            onToggle={() => setOpenPlotId((prev) => (prev === plot.id ? null : plot.id))}
            onClose={handleClose}
            onSelectPlot={onSelectPlot}
          />
        ))}
      </GoogleMap>
    </div>
  );
};

export const PlotsMap: React.FC<PlotsMapProps> = ({
  apiKey,
  plots,
  currencySymbol,
  selectedPlotId,
  heightClass = 'h-[420px] lg:h-[520px]',
  onSelectPlot,
}) => {
  if (!apiKey) {
    return (
      <div
        className={`${heightClass} w-full rounded-lg border border-[#E2E8E5] bg-[#F7F9F8] p-6 flex flex-col justify-between`}
      >
        <div>
          <div className="text-xs font-mono text-[#9E7822] mb-1">Parcel Coordinates Directory</div>
          <h3 className="font-display text-2xl font-semibold text-[#0B281F]">
            Interactive Plot Locations
          </h3>
          <p className="text-sm text-[#4B635A] mt-1 max-w-xl">
            Add your Google Maps browser key in configuration to render the embedded map view, or
            inspect exact plot coordinates directly in Google Maps below.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4 overflow-y-auto">
          {plots.map((plot) => (
            <div
              key={plot.id}
              className="bg-white border border-[#E2E8E5] rounded-md p-3.5 flex flex-col justify-between"
            >
              <div>
                <div className="text-xs font-mono text-[#5B7269]">
                  {plot.plotCode} · {plot.status}
                </div>
                <div className="font-semibold text-sm text-[#0B281F] mt-0.5">{plot.name}</div>
                <div className="text-xs text-[#4B635A] font-mono tabular-nums mt-1">
                  {plot.latitude.toFixed(4)}, {plot.longitude.toFixed(4)}
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-[#E2E8E5]">
                {onSelectPlot && (
                  <button
                    type="button"
                    onClick={() => onSelectPlot(plot)}
                    className="text-xs font-medium text-[#0B281F] hover:underline"
                  >
                    Plot Details
                  </button>
                )}
                <a
                  href={plot.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#9E7822] hover:underline"
                >
                  Open in Maps
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey} libraries={['marker']} language="en" region="IN">
      <InnerMapCanvas
        plots={plots}
        currencySymbol={currencySymbol}
        selectedPlotId={selectedPlotId}
        heightClass={heightClass}
        onSelectPlot={onSelectPlot}
      />
    </APIProvider>
  );
};
