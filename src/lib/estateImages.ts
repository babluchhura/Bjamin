import heroPlotEstateImg from '../assets/images/hero_plot_estate_1795758691327.jpg';
import plotHighwayCorridorImg from '../assets/images/plot_highway_corridor_1795758693036.jpg';
import plotLakesideGroveImg from '../assets/images/plot_lakeside_grove_1795758692275.jpg';
import plotOrchardEnclaveImg from '../assets/images/plot_orchard_enclave_1795758693403.jpg';
import plotValleyMeadowImg from '../assets/images/plot_valley_meadow_1795758692675.jpg';

const BUNDLED_ESTATE_IMAGES: Record<string, string> = {
  'hero_plot_estate_1795758691327.jpg': heroPlotEstateImg,
  'plot_highway_corridor_1795758693036.jpg': plotHighwayCorridorImg,
  'plot_lakeside_grove_1795758692275.jpg': plotLakesideGroveImg,
  'plot_orchard_enclave_1795758693403.jpg': plotOrchardEnclaveImg,
  'plot_valley_meadow_1795758692675.jpg': plotValleyMeadowImg,
};

export const DEFAULT_FALLBACK_PLOT_IMAGE = plotValleyMeadowImg;

export function resolveEstateImageUrl(src?: string | null): string {
  if (!src) return '';
  const trimmed = src.trim();
  if (!trimmed) return '';

  // Direct match for local asset paths stored in DB or seed data
  const normalized = trimmed.replace(/^\.?\//, '');
  if (normalized.startsWith('src/assets/images/')) {
    const filename = normalized.slice('src/assets/images/'.length).split('?')[0];
    if (BUNDLED_ESTATE_IMAGES[filename]) {
      return BUNDLED_ESTATE_IMAGES[filename];
    }
  }

  return trimmed;
}
