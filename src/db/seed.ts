import { sql } from 'drizzle-orm';
import { db } from './index.ts';
import { plots, reviews, siteSettings } from './schema.ts';

export const DEFAULT_SETTINGS: Record<string, string> = {
  companyName: 'Bolangir Jamin',
  tagline: 'Clear-Title Residential & Estate Land across Bolangir, Bargarh & Nuapada, Odisha',
  heroHeadline: 'Find Your Dream Plot With Us.',
  heroSubheadline:
    'Discover surveyed plots across Bolangir, Bargarh, and Nuapada — from compact residential decimals to full multi-hectare land parcels at every budget.',
  heroImage: '/src/assets/images/hero_plot_estate_1795758691327.jpg',
  aboutTitle: 'Trusted Residential & Hectare Land Across Western Odisha',
  aboutBody:
    'Bolangir Jamin develops residential plots and larger multi-hectare estate parcels across Bolangir, Bargarh, and Nuapada. Every parcel is surveyed, demarcated with permanent stone boundary pillars, backed by verified freehold Gharabari/Patta records, and connected to paved roads before release.',
  whatsappNumber: process.env.WHATSAPP_NUMBER || '919876543210',
  contactEmail: 'advisory@bolangirjamin.com',
  contactPhone: '+91 98765 43210',
  officeAddress: 'Station Road, Near Gandhinagar Chowk, Bolangir, Odisha 767001',
  currencySymbol: '₹',
  socialFacebook: 'https://facebook.com',
  socialInstagram: 'https://instagram.com',
  socialLinkedIn: 'https://linkedin.com',
  socialYoutube: 'https://youtube.com',
};

export const INITIAL_PLOTS = [
  {
    plotCode: 'OD-BLG-101',
    name: 'Gandhinagar Meadow Corner Plot',
    location: 'Bolangir, Odisha',
    totalArea: '10.0 Decimals · 0.0405 Ha (4,356 sq ft)',
    areaDecimals: 10.0,
    dimensions: '66 ft × 66 ft',
    price: 2800000,
    pricePerDecimal: 280000,
    roadAccess: '40 ft Paved Concrete Avenue (Dual Corner)',
    description:
      'Prime corner residential Gharabari plot in Bolangir near the Titilagarh Road bypass corridor. Features dual 40 ft concrete road frontage, storm-water drainage, underground electric supply line, and permanent boundary pillars ready for immediate house construction.',
    status: 'Available',
    featured: true,
    latitude: 20.7085,
    longitude: 83.492,
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=20.7085,83.492',
    images: [
      '/src/assets/images/plot_valley_meadow_1795758692675.jpg',
      '/src/assets/images/hero_plot_estate_1795758691327.jpg',
    ],
    highlights: [
      'Clear freehold Gharabari Patta & ROR verified',
      'Dual 40 ft paved concrete road frontage',
      '3-phase electric & municipal water connection ready',
      '8 mins from Bolangir Railway Station & District HQ',
    ],
  },
  {
    plotCode: 'OD-BRG-102',
    name: 'Canal View Promenade Parcel',
    location: 'Bargarh, Odisha',
    totalArea: '8.5 Decimals · 0.0344 Ha (3,703 sq ft)',
    areaDecimals: 8.5,
    dimensions: '55 ft × 67 ft',
    price: 2550000,
    pricePerDecimal: 300000,
    roadAccess: '35 ft Stone-Curbed Avenue off NH-53',
    description:
      'Well-elevated residential plot near the Bargarh canal corridor and NH-53 bypass. Level red-soil foundation terrain, peaceful green surroundings, and instant access to schools, hospitals, and Bargarh town center.',
    status: 'Available',
    featured: true,
    latitude: 21.341,
    longitude: 83.625,
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=21.341,83.625',
    images: [
      '/src/assets/images/plot_lakeside_grove_1795758692275.jpg',
      '/src/assets/images/plot_orchard_enclave_1795758693403.jpg',
    ],
    highlights: [
      '500 meters from NH-53 Sambalpur-Raipur Highway',
      'Level red-soil grade ideal for 2-story family home',
      'Gated perimeter wall with solar street lighting',
      'Immediate registration & mutation support',
    ],
  },
  {
    plotCode: 'OD-NPD-103',
    name: 'Khariar Road Gateway Enclave',
    location: 'Nuapada, Odisha',
    totalArea: '247.1 Decimals · 1.00 Hectare (1,07,639 sq ft)',
    areaDecimals: 247.1,
    dimensions: '330 ft × 326 ft',
    price: 14826000,
    pricePerDecimal: 60000,
    roadAccess: '40 ft Divided Township Highway Frontage',
    description:
      'Full 1.00 Hectare (247.1 Decimals) contiguous land parcel along the fast-growing Nuapada–Khariar Road corridor. Ideal for an integrated residential villa layout, institutional campus, farmhouse estate, or long-term land banking.',
    status: 'Available',
    featured: true,
    latitude: 20.822,
    longitude: 82.541,
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=20.822,82.541',
    images: [
      '/src/assets/images/plot_highway_corridor_1795758693036.jpg',
      '/src/assets/images/hero_plot_estate_1795758691327.jpg',
    ],
    highlights: [
      'Full 1.00 Hectare (247.1 Decimals) single-owner Patta',
      '40 ft blacktop & concrete main approach road',
      'Suitable for residential colony, school, or villa estate',
      'Zero encumbrance & bank finance eligible',
    ],
  },
  {
    plotCode: 'OD-BLG-104',
    name: 'Shantipada Starter Family Plot',
    location: 'Bolangir, Odisha',
    totalArea: '4.5 Decimals · 0.0182 Ha (1,960 sq ft)',
    areaDecimals: 4.5,
    dimensions: '40 ft × 49 ft',
    price: 855000,
    pricePerDecimal: 190000,
    roadAccess: '30 ft Quiet Colony Concrete Road',
    description:
      'Budget-friendly residential plot in Bolangir tailored for compact single-family homes. Demarcated with stone boundary pillars, completed storm drainage, and clean neighborhood access.',
    status: 'Available',
    featured: false,
    latitude: 20.695,
    longitude: 83.475,
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=20.695,83.475',
    images: [
      '/src/assets/images/plot_orchard_enclave_1795758693403.jpg',
      '/src/assets/images/plot_valley_meadow_1795758692675.jpg',
    ],
    highlights: [
      'Entry-level budget residential parcel under ₹9 Lakhs',
      '30 ft concrete colony road with zero through-traffic',
      'Verified ROR Patta & demarcation map',
      'Ready for immediate boundary wall construction',
    ],
  },
  {
    plotCode: 'OD-BRG-105',
    name: 'Bhatli Road Half-Hectare Estate',
    location: 'Bargarh, Odisha',
    totalArea: '123.5 Decimals · 0.50 Hectare (53,797 sq ft)',
    areaDecimals: 123.5,
    dimensions: '220 ft × 245 ft',
    price: 9262500,
    pricePerDecimal: 75000,
    roadAccess: '40 ft Concrete Boulevard off Bhatli Road',
    description:
      'Spacious 0.50 Hectare (123.5 Decimals) estate parcel off Bhatli Road in Bargarh, designed for multi-family compound living, orchard farmhouse development, or commercial warehousing.',
    status: 'Available',
    featured: false,
    latitude: 21.329,
    longitude: 83.611,
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=21.329,83.611',
    images: [
      '/src/assets/images/hero_plot_estate_1795758691327.jpg',
      '/src/assets/images/plot_valley_meadow_1795758692675.jpg',
    ],
    highlights: [
      '0.50 Hectare (123.5 Decimals) contiguous boundary',
      'Close to Bargarh District Hospital & market',
      'Gated perimeter & overhead water supply',
      'Eligible for major bank plot-plus-construction loans',
    ],
  },
  {
    plotCode: 'OD-NPD-106',
    name: 'Ekta Chowk Green Garden Parcel',
    location: 'Nuapada, Odisha',
    totalArea: '6.0 Decimals · 0.0243 Ha (2,614 sq ft)',
    areaDecimals: 6.0,
    dimensions: '42 ft × 62 ft',
    price: 1140000,
    pricePerDecimal: 190000,
    roadAccess: '30 ft Paved Colony Road',
    description:
      'Well-located residential plot near Ekta Chowk in Nuapada, surrounded by newly constructed family residences with ready electric pole access and clear freehold registration.',
    status: 'Reserved',
    featured: false,
    latitude: 20.8095,
    longitude: 82.528,
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=20.8095,82.528',
    images: [
      '/src/assets/images/plot_lakeside_grove_1795758692275.jpg',
      '/src/assets/images/plot_highway_corridor_1795758693036.jpg',
    ],
    highlights: [
      'Established residential neighborhood in Nuapada',
      'Full legal title & EC clearance verified',
      'Ready for immediate home construction',
      '10 mins from Khariar Road Railway Station',
    ],
  },
];

export const INITIAL_REVIEWS = [
  {
    customerName: 'Subrat & Sasmita Mishra',
    customerRole: 'Homeowners, Bolangir (Plot OD-BLG-101)',
    rating: 5,
    comment:
      'Every ROR Patta record, road width measurement, and stone boundary pillar matched what we inspected on site in Bolangir. Registration at the Sub-Registrar office was completed smoothly without any hidden charges.',
    plotPurchased: 'OD-BLG-101',
    isPublished: true,
  },
  {
    customerName: 'Dr. Pradeep Patel',
    customerRole: 'Physician, Bargarh (Plot OD-BRG-102)',
    rating: 5,
    comment:
      'Finding clear Gharabari residential plots near NH-53 in Bargarh with concrete roads already built is rare. Their advisor walked us through the complete encumbrance certificate before booking.',
    plotPurchased: 'OD-BRG-102',
    isPublished: true,
  },
  {
    customerName: 'Bikash & Ananya Sahu',
    customerRole: 'Estate Investors, Nuapada (Plot OD-NPD-103)',
    rating: 5,
    comment:
      'We acquired a full 1-hectare parcel along Khariar Road in Nuapada. Having both Decimal and Hectare measurements alongside transparent ₹ per-decimal pricing made our evaluation straightforward.',
    plotPurchased: 'OD-NPD-103',
    isPublished: true,
  },
  {
    customerName: 'Manoj Kumar Meher',
    customerRole: 'Senior Engineer, Bargarh',
    rating: 5,
    comment:
      'The WhatsApp coordination and live Google Maps pins saved us hours when visiting multiple plots across Bolangir and Bargarh with our family.',
    plotPurchased: 'OD-BRG-105',
    isPublished: true,
  },
];

let seedPromise: Promise<void> | null = null;

export async function ensureDatabaseSeeded(): Promise<void> {
  if (seedPromise) return seedPromise;
  seedPromise = (async () => {
    try {
      const [{ count: settingsCount }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(siteSettings);

      if (settingsCount === 0) {
        for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
          await db
            .insert(siteSettings)
            .values({ key, value })
            .onConflictDoNothing({ target: siteSettings.key });
        }
      }

      const [{ count: plotsCount }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(plots);

      if (plotsCount === 0) {
        await db.insert(plots).values(INITIAL_PLOTS).onConflictDoNothing();
      }

      const [{ count: reviewsCount }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(reviews);

      if (reviewsCount === 0) {
        await db.insert(reviews).values(INITIAL_REVIEWS);
      }
    } catch (error) {
      seedPromise = null;
      console.error('Failed to seed initial database state:', error);
    }
  })();

  return seedPromise;
}
