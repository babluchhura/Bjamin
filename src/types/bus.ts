export type Seat = {
  id: number;
  seatNo: string;
  deck: 'lower' | 'upper';
  seatType: 'seater' | 'sleeper';
  isLadies: boolean;
  status: 'available' | 'held' | 'booked';
};

export type Point = { id: number; name: string; city: string; time: string; landmark?: string | null };

export type BusInfo = {
  id: number;
  name: string;
  busType: string;
  layout: string;
  totalSeats: number;
  amenities: string[];
  rating: number;
  regNo?: string;
};

export type TripSummary = {
  id: number;
  departAt: string;
  arriveAt: string;
  fare: number;
  status: string;
  bus: BusInfo;
  operator: { id: number; name: string; rating: number };
  route: { id: number; origin: string; destination: string; distanceKm: number; durationMin: number };
  availableSeats: number;
  totalSeats: number;
  boardingPoints: Point[];
  droppingPoints: Point[];
};

export type TripDetail = TripSummary & { seats: Seat[] };

export type Passenger = { name: string; age: number | string; gender: string; seatNo: string };

export type Booking = {
  id: number;
  code: string;
  tripId: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  boardingPoint: string;
  droppingPoint: string;
  seats: string;
  passengerCount: number;
  fareTotal: number;
  discount: number;
  totalAmount: number;
  couponCode?: string | null;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  refundAmount: number;
  createdAt: string;
};

export type MyBooking = Booking & {
  trip: { id: number; departAt: string; arriveAt: string; fare: number };
  route: { origin: string; destination: string };
  bus: { id: number; name: string; busType: string };
  operator: { id: number; name: string };
  passengers: Array<{ id: number; name: string; age: number; gender: string; seatNo: string; fare: number }>;
};

export type BookingDetail = {
  booking: Booking;
  trip: {
    trip: { id: number; departAt: string; arriveAt: string; fare: number; status: string };
    bus: BusInfo;
    operator: { id: number; name: string; rating: number };
    route: { origin: string; destination: string; distanceKm: number; durationMin: number };
  } | null;
  passengers: Array<{ id: number; name: string; age: number; gender: string; seatNo: string; fare: number }>;
  payments: Array<{ id: number; status: string; amount: number; paymentId?: string | null; createdAt: string; message?: string | null }>;
};

export type PublicConfig = {
  settings: Record<string, string>;
  razorpayKeyId: string;
  paymentsConfigured: boolean;
};
