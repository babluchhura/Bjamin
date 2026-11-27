import React, { useMemo, useState } from 'react';
import { RotateCcw, Search } from 'lucide-react';
import { PlotCard } from '../components/PlotCard';
import { useEstate } from '../context/EstateContext';
import { decimalsToHectares, hectaresToDecimals } from '../lib/api';
import type { PlotFilters, PlotItem } from '../types/estate';

interface PlotsListPageProps {
  filters: PlotFilters;
  onFiltersChange: (next: PlotFilters) => void;
  onSelectPlot: (plot: PlotItem) => void;
  onBookVisit: (plot: PlotItem) => void;
}

export const PlotsListPage: React.FC<PlotsListPageProps> = ({
  filters,
  onFiltersChange,
  onSelectPlot,
  onBookVisit,
}) => {
  const { plots, settings, loading } = useEstate();
  const [sizeUnit, setSizeUnit] = useState<'decimals' | 'hectares'>('decimals');

  const locations = useMemo(
    () => Array.from(new Set(plots.map((p) => p.location))).sort(),
    [plots]
  );

  const filteredPlots = useMemo(() => {
    return plots.filter((plot) => {
      if (filters.location && filters.location !== 'All' && plot.location !== filters.location) {
        return false;
      }
      if (filters.status && filters.status !== 'All' && plot.status !== filters.status) {
        return false;
      }
      if (filters.minPrice && plot.price < Number(filters.minPrice)) {
        return false;
      }
      if (filters.maxPrice && plot.price > Number(filters.maxPrice)) {
        return false;
      }
      if (filters.minSize && plot.areaDecimals < Number(filters.minSize)) {
        return false;
      }
      if (filters.maxSize && plot.areaDecimals > Number(filters.maxSize)) {
        return false;
      }
      if (filters.q && filters.q.trim()) {
        const q = filters.q.trim().toLowerCase();
        const hay = `${plot.plotCode} ${plot.name} ${plot.location} ${plot.totalArea} ${plot.description}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [plots, filters]);

  const resetFilters = () =>
    onFiltersChange({
      q: '',
      location: 'All',
      status: 'All',
      minPrice: '',
      maxPrice: '',
      minSize: '',
      maxSize: '',
    });

  const minSizeDisplay = filters.minSize
    ? sizeUnit === 'hectares'
      ? Number(decimalsToHectares(Number(filters.minSize)).toFixed(4)).toString()
      : filters.minSize
    : '';

  const maxSizeDisplay = filters.maxSize
    ? sizeUnit === 'hectares'
      ? Number(decimalsToHectares(Number(filters.maxSize)).toFixed(4)).toString()
      : filters.maxSize
    : '';

  const handleSizeInput = (bound: 'minSize' | 'maxSize', rawVal: string) => {
    if (!rawVal) {
      onFiltersChange({ ...filters, [bound]: '' });
      return;
    }
    const num = Number(rawVal);
    if (Number.isNaN(num) || num < 0) return;
    const inDecimals =
      sizeUnit === 'hectares' ? String(Number(hectaresToDecimals(num).toFixed(2))) : rawVal;
    onFiltersChange({ ...filters, [bound]: inDecimals });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <p className="text-xs font-mono text-[#9E7822] mb-1">Parcel Inventory</p>
        <h1 className="font-display text-4xl font-semibold text-[#0B281F]">
          Available Plots — All Decimals, Hectares &amp; Budgets
        </h1>
        <p className="text-sm text-[#4B635A] mt-2 max-w-2xl">
          Filter surveyed land parcels across Bolangir, Bargarh, and Nuapada by any budget range,
          plot area in Decimals or Hectares, and live availability status.
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-[#F7F9F8] border border-[#E2E8E5] rounded-lg p-5 mb-8 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#3D524A] mb-1.5">
              Search Keyword or ID
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-[#5B7269] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={filters.q || ''}
                onChange={(e) => onFiltersChange({ ...filters, q: e.target.value })}
                placeholder="Bolangir, Bargarh, Nuapada..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-[#D4DDD8] rounded-md text-[#10241D]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#3D524A] mb-1.5">Location</label>
            <select
              value={filters.location || 'All'}
              onChange={(e) => onFiltersChange({ ...filters, location: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-white border border-[#D4DDD8] rounded-md text-[#10241D]"
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
              Availability
            </label>
            <select
              value={filters.status || 'All'}
              onChange={(e) => onFiltersChange({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-white border border-[#D4DDD8] rounded-md text-[#10241D]"
            >
              <option value="All">All Statuses</option>
              <option value="Available">Available</option>
              <option value="Reserved">Reserved</option>
              <option value="Sold">Sold</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#3D524A] mb-1.5">
              Area Unit Preference
            </label>
            <div className="flex items-center gap-1 p-1 bg-white border border-[#D4DDD8] rounded-md h-[38px]">
              <button
                type="button"
                onClick={() => setSizeUnit('decimals')}
                className={`flex-1 py-1 text-xs font-medium rounded transition-colors ${
                  sizeUnit === 'decimals'
                    ? 'bg-[#0B281F] text-white'
                    : 'text-[#3D524A] hover:text-[#0B281F]'
                }`}
              >
                Decimals
              </button>
              <button
                type="button"
                onClick={() => setSizeUnit('hectares')}
                className={`flex-1 py-1 text-xs font-medium rounded transition-colors ${
                  sizeUnit === 'hectares'
                    ? 'bg-[#0B281F] text-white'
                    : 'text-[#3D524A] hover:text-[#0B281F]'
                }`}
              >
                Hectares
              </button>
            </div>
          </div>
        </div>

        {/* Custom Budget (Min / Max) & Custom Size (All Decimals / All Hectares) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-[#E2E8E5]">
          <div>
            <label className="block text-xs font-medium text-[#3D524A] mb-1.5">
              Min Budget ({settings.currencySymbol})
            </label>
            <input
              type="number"
              min={0}
              step={50000}
              value={filters.minPrice || ''}
              onChange={(e) => onFiltersChange({ ...filters, minPrice: e.target.value })}
              placeholder="Any Min (e.g. 500000)"
              className="w-full px-3 py-2 text-sm bg-white border border-[#D4DDD8] rounded-md text-[#10241D] tabular-nums"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#3D524A] mb-1.5">
              Max Budget ({settings.currencySymbol})
            </label>
            <input
              type="number"
              min={0}
              step={50000}
              value={filters.maxPrice || ''}
              onChange={(e) => onFiltersChange({ ...filters, maxPrice: e.target.value })}
              placeholder="Any Max (e.g. 15000000)"
              className="w-full px-3 py-2 text-sm bg-white border border-[#D4DDD8] rounded-md text-[#10241D] tabular-nums"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#3D524A] mb-1.5">
              Min Size ({sizeUnit === 'hectares' ? 'Hectares' : 'Decimals'})
            </label>
            <input
              type="number"
              min={0}
              step={sizeUnit === 'hectares' ? '0.01' : '0.5'}
              value={minSizeDisplay}
              onChange={(e) => handleSizeInput('minSize', e.target.value)}
              placeholder={sizeUnit === 'hectares' ? 'e.g. 0.02 or 1.0' : 'e.g. 3 or 247'}
              className="w-full px-3 py-2 text-sm bg-white border border-[#D4DDD8] rounded-md text-[#10241D] tabular-nums"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#3D524A] mb-1.5">
              Max Size ({sizeUnit === 'hectares' ? 'Hectares' : 'Decimals'})
            </label>
            <input
              type="number"
              min={0}
              step={sizeUnit === 'hectares' ? '0.01' : '0.5'}
              value={maxSizeDisplay}
              onChange={(e) => handleSizeInput('maxSize', e.target.value)}
              placeholder={sizeUnit === 'hectares' ? 'Any Max Hectares' : 'Any Max Decimals'}
              className="w-full px-3 py-2 text-sm bg-white border border-[#D4DDD8] rounded-md text-[#10241D] tabular-nums"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#E2E8E5]">
          <p className="text-xs text-[#4B635A] tabular-nums">
            Showing <span className="font-semibold text-[#0B281F]">{filteredPlots.length}</span> of{' '}
            {plots.length} surveyed parcels · 1 Hectare = 247.11 Decimals
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0B281F] hover:text-[#9E7822]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Filters
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-[420px] rounded-lg border border-[#E2E8E5] bg-[#F7F9F8] animate-pulse"
            />
          ))}
        </div>
      ) : filteredPlots.length === 0 ? (
        <div className="bg-white border border-[#E2E8E5] rounded-lg p-12 text-center">
          <h2 className="font-display text-2xl font-semibold text-[#0B281F]">
            No plots match these filter criteria
          </h2>
          <p className="text-sm text-[#4B635A] mt-2">
            Try expanding your budget ceiling or clearing the location filter to inspect all
            parcels.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-5 px-5 py-2.5 text-xs font-semibold text-white bg-[#0B281F] rounded-md hover:bg-[#12382B]"
          >
            Show All Plots
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlots.map((plot) => (
            <PlotCard
              key={plot.id}
              plot={plot}
              currencySymbol={settings.currencySymbol}
              whatsappNumber={settings.whatsappNumber}
              onSelectPlot={onSelectPlot}
              onBookVisit={onBookVisit}
            />
          ))}
        </div>
      )}
    </div>
  );
};
