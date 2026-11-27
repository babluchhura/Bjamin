import type {
  AdminAuthConfig,
  AdminStats,
  AdminUser,
  InquiryItem,
  InquiryStatus,
  PlotFilters,
  PlotItem,
  ReviewItem,
  SiteSettingsMap,
  SiteVisitItem,
  VisitStatus,
} from '../types/estate';

async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload?.error || `Request failed with status ${res.status}`);
  }
  return payload as T;
}

export const DECIMALS_PER_HECTARE = 247.105381;

export function decimalsToHectares(decimals: number): number {
  return decimals / DECIMALS_PER_HECTARE;
}

export function hectaresToDecimals(hectares: number): number {
  return hectares * DECIMALS_PER_HECTARE;
}

export function formatHectares(decimals: number): string {
  const ha = decimalsToHectares(decimals);
  return ha >= 0.1 ? `${ha.toFixed(2)} Ha` : `${ha.toFixed(4)} Ha`;
}

export function formatCurrency(amount: number, symbol = '₹'): string {
  const locale = symbol === '₹' ? 'en-IN' : 'en-US';
  return `${symbol}${amount.toLocaleString(locale)}`;
}

export function buildWhatsAppUrl(phone: string, text: string): string {
  const digits = phone.replace(/[^\d]/g, '') || '919876543210';
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export const api = {
  getPublicConfig: () =>
    requestJson<{
      googleMapsApiKey: string;
      supabaseUrl?: string;
      supabaseAnonKey?: string;
    }>('/api/public-config'),
  getSettings: () => requestJson<SiteSettingsMap>('/api/settings'),
  getPlots: (filters?: PlotFilters) => {
    const params = new URLSearchParams();
    if (filters) {
      for (const [k, v] of Object.entries(filters)) {
        if (v && v !== 'All') params.set(k, v);
      }
    }
    const qs = params.toString();
    return requestJson<PlotItem[]>(`/api/plots${qs ? `?${qs}` : ''}`);
  },
  getPlot: (idOrCode: string | number) => requestJson<PlotItem>(`/api/plots/${idOrCode}`),
  getReviews: () => requestJson<ReviewItem[]>('/api/reviews'),
  submitReview: (data: {
    customerName: string;
    customerRole: string;
    rating: number;
    comment: string;
    plotPurchased?: string;
  }) =>
    requestJson<ReviewItem>('/api/reviews', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  submitInquiry: (data: {
    plotId?: number | null;
    plotName?: string | null;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    message: string;
  }) =>
    requestJson<InquiryItem>('/api/inquiries', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  bookSiteVisit: (data: {
    plotId?: number | null;
    plotName?: string | null;
    visitorName: string;
    visitorEmail: string;
    visitorPhone: string;
    preferredDate: string;
    preferredTime: string;
    guestsCount: number;
    notes?: string;
  }) =>
    requestJson<SiteVisitItem>('/api/site-visits', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Auth & Admin endpoints (token kept in memory only)
  getAdminAuthConfig: () => requestJson<AdminAuthConfig>('/api/admin/auth-config'),
  adminLogin: (data: {
    username?: string;
    password?: string;
    supabaseAccessToken?: string;
  }) =>
    requestJson<{ token: string; user: AdminUser }>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  adminChangePassword: (
    token: string,
    data: { currentPassword: string; newUsername?: string; newPassword: string }
  ) =>
    requestJson<{ updated: boolean; username: string }>('/api/admin/change-password', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    }),
  getMe: (token: string) =>
    requestJson<{ uid: string; email: string; name: string | null; role: string }>(
      '/api/auth/me',
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    ),
  getAdminStats: (token: string) =>
    requestJson<AdminStats>('/api/admin/stats', {
      headers: { Authorization: `Bearer ${token}` },
    }),
  uploadImages: (
    token: string,
    files: { filename: string; mimeType: string; dataBase64: string }[]
  ) =>
    requestJson<{ urls: string[] }>('/api/media/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ files }),
    }),
  createPlot: (token: string, plot: Partial<PlotItem>) =>
    requestJson<PlotItem>('/api/plots', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(plot),
    }),
  updatePlot: (token: string, id: number, plot: Partial<PlotItem>) =>
    requestJson<PlotItem>(`/api/plots/${id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(plot),
    }),
  deletePlot: (token: string, id: number) =>
    requestJson<{ deleted: boolean }>(`/api/plots/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }),
  getAdminInquiries: (token: string) =>
    requestJson<InquiryItem[]>('/api/admin/inquiries', {
      headers: { Authorization: `Bearer ${token}` },
    }),
  updateInquiryStatus: (token: string, id: number, status: InquiryStatus) =>
    requestJson<InquiryItem>(`/api/admin/inquiries/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    }),
  deleteInquiry: (token: string, id: number) =>
    requestJson<{ deleted: boolean }>(`/api/admin/inquiries/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }),
  getAdminVisits: (token: string) =>
    requestJson<SiteVisitItem[]>('/api/admin/site-visits', {
      headers: { Authorization: `Bearer ${token}` },
    }),
  updateVisitStatus: (token: string, id: number, status: VisitStatus) =>
    requestJson<SiteVisitItem>(`/api/admin/site-visits/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    }),
  deleteVisit: (token: string, id: number) =>
    requestJson<{ deleted: boolean }>(`/api/admin/site-visits/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
      body: undefined,
    }),
  getAdminReviews: (token: string) =>
    requestJson<ReviewItem[]>('/api/admin/reviews', {
      headers: { Authorization: `Bearer ${token}` },
    }),
  updateReviewPublished: (token: string, id: number, isPublished: boolean) =>
    requestJson<ReviewItem>(`/api/admin/reviews/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ isPublished }),
    }),
  deleteReview: (token: string, id: number) =>
    requestJson<{ deleted: boolean }>(`/api/admin/reviews/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }),
  updateSettings: (token: string, updates: Partial<SiteSettingsMap>) =>
    requestJson<SiteSettingsMap>('/api/admin/settings', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(updates),
    }),
};
