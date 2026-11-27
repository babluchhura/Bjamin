import type { Booking, BookingDetail, MyBooking, PublicConfig, TripDetail, TripSummary } from '../types/bus';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    credentials: 'same-origin',
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError((payload as { error?: string })?.error || `Request failed (${res.status})`, res.status);
  }
  return payload as T;
}

const json = (body: unknown) => ({ method: 'POST', body: JSON.stringify(body) });
const put = (body: unknown) => ({ method: 'PUT', body: JSON.stringify(body) });

export const api = {
  config: () => apiFetch<PublicConfig>('/api/config'),
  settings: () => apiFetch<Record<string, string>>('/api/settings'),
  cities: () => apiFetch<string[]>('/api/cities'),
  banners: () => apiFetch<Array<{ id: number; title: string; subtitle: string; ctaText: string; ctaLink: string }>>('/api/banners'),
  popularRoutes: () => apiFetch<Array<{ route: { id: number; origin: string; destination: string; distanceKm: number }; minFare: number }>>('/api/popular-routes'),
  reviews: () => apiFetch<Array<{ id: number; authorName: string; routeLabel: string | null; rating: number; comment: string; createdAt: string }>>('/api/reviews'),
  postReview: (body: { rating: number; comment: string; routeLabel?: string }) => apiFetch<{ message: string }>('/api/reviews', json(body)),
  contact: (body: { name: string; email: string; phone: string; subject: string; message: string }) =>
    apiFetch<{ ok: boolean }>('/api/contact', json(body)),

  searchTrips: (params: { from?: string; to?: string; date?: string }) => {
    const qs = new URLSearchParams();
    if (params.from) qs.set('from', params.from);
    if (params.to) qs.set('to', params.to);
    if (params.date) qs.set('date', params.date);
    return apiFetch<TripSummary[]>(`/api/trips?${qs.toString()}`);
  },
  trip: (id: number | string) => apiFetch<TripDetail>(`/api/trips/${id}`),
  holdSeats: (tripId: number | string, seats: string[]) =>
    apiFetch<{ holdToken: string; heldUntil: string; holdMinutes: number; farePerSeat: number; fareTotal: number }>(
      `/api/trips/${tripId}/hold`,
      json({ seats })
    ),
  validateCoupon: (code: string, amount: number) =>
    apiFetch<{ code: string; description: string; discount: number }>('/api/coupons/validate', json({ code, amount })),
  createBooking: (body: unknown) =>
    apiFetch<{
      booking: Booking;
      paymentsConfigured: boolean;
      message?: string;
      payment: { orderId: string; amount: number; currency: string; keyId: string } | null;
    }>('/api/bookings', json(body)),
  verifyPayment: (body: { code: string; razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) =>
    apiFetch<{ booking: Booking }>('/api/payments/verify', json(body)),
  reportPaymentFailure: (body: { code: string; razorpay_order_id?: string; reason?: string }) =>
    apiFetch<{ ok: boolean }>('/api/payments/failed', json(body)),

  myBookings: () => apiFetch<MyBooking[]>('/api/bookings/mine'),
  booking: (code: string) => apiFetch<BookingDetail>(`/api/bookings/${code}`),
  cancelBooking: (code: string, reason: string) =>
    apiFetch<{ booking: Booking; refundAmount: number; refundNote: string }>(`/api/bookings/${code}/cancel`, json({ reason })),

  login: (email: string, password: string) =>
    apiFetch<{ user: SessionUser }>('/api/auth/login', json({ email, password })),
  register: (body: { name: string; email: string; phone: string; password: string }) =>
    apiFetch<{ user: SessionUser }>('/api/auth/register', json(body)),
  logout: () => apiFetch<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),
  me: () => apiFetch<{ user: SessionUser }>('/api/auth/me'),
  updateProfile: (body: { name: string; phone: string }) => apiFetch<{ user: SessionUser }>('/api/auth/profile', { ...put(body), method: 'PATCH' }),
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    apiFetch<{ ok: boolean }>('/api/auth/password', json(body)),

  admin: {
    stats: () => apiFetch<AdminStats>('/api/admin/stats'),
    operators: () => apiFetch<AdminOperator[]>('/api/admin/operators'),
    createOperator: (body: unknown) => apiFetch<AdminOperator>('/api/admin/operators', json(body)),
    updateOperator: (id: number, body: unknown) => apiFetch<AdminOperator>(`/api/admin/operators/${id}`, put(body)),
    deleteOperator: (id: number) => apiFetch<{ ok: boolean }>(`/api/admin/operators/${id}`, { method: 'DELETE' }),

    buses: () => apiFetch<AdminBus[]>('/api/admin/buses'),
    createBus: (body: unknown) => apiFetch<AdminBus>('/api/admin/buses', json(body)),
    updateBus: (id: number, body: unknown) => apiFetch<AdminBus>(`/api/admin/buses/${id}`, put(body)),
    deleteBus: (id: number) => apiFetch<{ ok: boolean }>(`/api/admin/buses/${id}`, { method: 'DELETE' }),

    routes: () => apiFetch<AdminRoute[]>('/api/admin/routes'),
    createRoute: (body: unknown) => apiFetch<AdminRoute>('/api/admin/routes', json(body)),
    updateRoute: (id: number, body: unknown) => apiFetch<AdminRoute>(`/api/admin/routes/${id}`, put(body)),
    deleteRoute: (id: number) => apiFetch<{ ok: boolean }>(`/api/admin/routes/${id}`, { method: 'DELETE' }),

    trips: () => apiFetch<AdminTrip[]>('/api/admin/trips'),
    createTrip: (body: unknown) => apiFetch<{ id: number }>('/api/admin/trips', json(body)),
    updateTrip: (id: number, body: unknown) => apiFetch<unknown>(`/api/admin/trips/${id}`, put(body)),
    tripPoints: (id: number) =>
      apiFetch<{ boarding: Array<{ id: number; name: string; city: string; time: string; landmark?: string | null }>; dropping: Array<{ id: number; name: string; city: string; time: string; landmark?: string | null }> }>(
        `/api/admin/trips/${id}/points`
      ),
    saveTripPoints: (id: number, body: unknown) => apiFetch<unknown>(`/api/admin/trips/${id}/points`, put(body)),
    deleteTrip: (id: number) => apiFetch<{ ok: boolean }>(`/api/admin/trips/${id}`, { method: 'DELETE' }),

    bookings: (status = 'all', q = '') => apiFetch<AdminBooking[]>(`/api/admin/bookings?status=${status}&q=${encodeURIComponent(q)}`),
    confirmBooking: (code: string, method: string) =>
      apiFetch<{ booking: Booking }>(`/api/admin/bookings/${code}/confirm`, json({ method })),
    customers: () => apiFetch<AdminCustomer[]>('/api/admin/customers'),
    setCustomerActive: (id: number, active: boolean) => apiFetch<{ ok: boolean }>(`/api/admin/customers/${id}`, { ...put({ active }), method: 'PATCH' }),
    payments: () => apiFetch<AdminPayment[]>('/api/admin/payments'),

    coupons: () => apiFetch<AdminCoupon[]>('/api/admin/coupons'),
    createCoupon: (body: unknown) => apiFetch<AdminCoupon>('/api/admin/coupons', json(body)),
    updateCoupon: (id: number, body: unknown) => apiFetch<AdminCoupon>(`/api/admin/coupons/${id}`, put(body)),
    deleteCoupon: (id: number) => apiFetch<{ ok: boolean }>(`/api/admin/coupons/${id}`, { method: 'DELETE' }),

    reviews: () => apiFetch<AdminReview[]>('/api/admin/reviews'),
    setReviewStatus: (id: number, status: string) => apiFetch<AdminReview>(`/api/admin/reviews/${id}`, { ...put({ status }), method: 'PATCH' }),
    deleteReview: (id: number) => apiFetch<{ ok: boolean }>(`/api/admin/reviews/${id}`, { method: 'DELETE' }),

    banners: () => apiFetch<AdminBanner[]>('/api/admin/banners'),
    createBanner: (body: unknown) => apiFetch<AdminBanner>('/api/admin/banners', json(body)),
    updateBanner: (id: number, body: unknown) => apiFetch<AdminBanner>(`/api/admin/banners/${id}`, put(body)),
    deleteBanner: (id: number) => apiFetch<{ ok: boolean }>(`/api/admin/banners/${id}`, { method: 'DELETE' }),

    settings: () => apiFetch<Record<string, string>>('/api/settings'),
    saveSettings: (body: Record<string, string>) => apiFetch<Record<string, string>>('/api/admin/settings', put(body)),
    notifications: () => apiFetch<Array<{ id: number; channel: string; recipient: string; subject: string; status: string; createdAt: string }>>('/api/admin/notifications'),
    reports: (days: number) => apiFetch<{ daily: Array<{ day: string; bookings: number; revenue: number }>; topRoutes: Array<{ routeLabel: string; bookings: number; revenue: number }> }>(`/api/admin/reports?days=${days}`),
  },
};

export type SessionUser = { id: number; email: string; name: string; phone: string | null; role: 'customer' | 'admin' };

export type AdminStats = {
  totalBookings: number;
  confirmedBookings: number;
  pendingBookings: number;
  cancelledBookings: number;
  revenue: number;
  refunded: number;
  todayBookings: number;
  totalCustomers: number;
  totalBuses: number;
  totalRoutes: number;
  recentBookings: Array<{ code: string; contactName: string; totalAmount: number; status: string; routeLabel: string; createdAt: string }>;
};

export type AdminOperator = { id: number; name: string; contactEmail: string | null; contactPhone: string | null; rating: number; active: boolean };
export type AdminBus = { id: number; operatorId: number; operatorName: string; name: string; regNo: string; busType: string; layout: string; totalSeats: number; rating: number; amenities: string[]; active: boolean };
export type AdminRoute = { id: number; origin: string; destination: string; distanceKm: number; durationMin: number; active: boolean };
export type AdminTrip = { id: number; busId: number; routeId: number; departAt: string; arriveAt: string; fare: number; status: string; busName: string; busType: string; operatorName: string; origin: string; destination: string };
export type AdminBooking = Booking & { routeLabel: string; busName: string; departAt: string };
export type AdminCustomer = { id: number; name: string; email: string; phone: string | null; role: string; active: boolean; createdAt: string; bookings: number; spend: number };
export type AdminPayment = { id: number; bookingCode: string; contactName: string; amount: number; status: string; provider: string; paymentId: string | null; createdAt: string; message: string | null };
export type AdminCoupon = { id: number; code: string; description: string; discountType: string; value: number; minAmount: number; maxDiscount: number; usageLimit: number; usedCount: number; active: boolean };
export type AdminReview = { id: number; authorName: string; routeLabel: string | null; rating: number; comment: string; status: string; createdAt: string };
export type AdminBanner = { id: number; title: string; subtitle: string; ctaText: string; ctaLink: string; active: boolean; sortOrder: number };
