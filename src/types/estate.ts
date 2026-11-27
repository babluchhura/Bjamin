export type PlotStatus = 'Available' | 'Reserved' | 'Sold';
export type InquiryStatus = 'New' | 'Contacted' | 'Closed';
export type VisitStatus = 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';

export interface PlotItem {
  id: number;
  plotCode: string;
  name: string;
  location: string;
  totalArea: string;
  areaDecimals: number;
  dimensions: string;
  price: number;
  pricePerDecimal: number;
  roadAccess: string;
  description: string;
  status: PlotStatus;
  featured: boolean;
  latitude: number;
  longitude: number;
  googleMapsUrl: string;
  images: string[];
  highlights: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface InquiryItem {
  id: number;
  plotId: number | null;
  plotName: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  message: string;
  status: InquiryStatus;
  createdAt: string;
}

export interface SiteVisitItem {
  id: number;
  plotId: number | null;
  plotName: string | null;
  visitorName: string;
  visitorEmail: string;
  visitorPhone: string;
  preferredDate: string;
  preferredTime: string;
  guestsCount: number;
  notes: string | null;
  status: VisitStatus;
  createdAt: string;
}

export interface ReviewItem {
  id: number;
  customerName: string;
  customerRole: string;
  rating: number;
  comment: string;
  plotPurchased: string | null;
  isPublished: boolean;
  createdAt: string;
}

export interface SiteSettingsMap {
  companyName: string;
  tagline: string;
  heroHeadline: string;
  heroSubheadline: string;
  heroImage: string;
  aboutTitle: string;
  aboutBody: string;
  whatsappNumber: string;
  contactEmail: string;
  contactPhone: string;
  officeAddress: string;
  currencySymbol: string;
  socialFacebook: string;
  socialInstagram: string;
  socialLinkedIn: string;
  socialYoutube: string;
  [key: string]: string;
}

export interface AdminStats {
  totalPlots: number;
  availablePlots: number;
  reservedPlots: number;
  soldPlots: number;
  availableInventoryValue: number;
  totalInquiries: number;
  newInquiries: number;
  totalVisits: number;
  pendingVisits: number;
  totalReviews: number;
}

export interface PlotFilters {
  q?: string;
  location?: string;
  status?: string;
  minPrice?: string;
  maxPrice?: string;
  minSize?: string;
  maxSize?: string;
}

export interface AdminAuthConfig {
  authMode: 'supabase' | 'env' | 'database' | 'unconfigured';
  credentialsReady: boolean;
  supabaseConfigured: boolean;
  envCredentialsConfigured: boolean;
  databaseUrlConfigured: boolean;
}

export interface AdminUser {
  uid: string;
  username: string;
  email: string;
  role: 'admin';
  provider: 'supabase' | 'env' | 'database';
}
