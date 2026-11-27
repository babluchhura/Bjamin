export type CheckoutState = {
  tripId: number;
  seats: string[];
  holdToken: string;
  heldUntil: string;
  farePerSeat: number;
  fareTotal: number;
  boardingPoint: string;
  droppingPoint: string;
  passengers: Array<{ name: string; age: string; gender: string; seatNo: string }>;
  contact: { name: string; email: string; phone: string };
  couponCode?: string;
  discount?: number;
};

const KEY = 'uy_checkout';

export function readCheckout(): CheckoutState | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CheckoutState;
    if (!parsed?.tripId || !parsed?.holdToken) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeCheckout(state: CheckoutState): void {
  sessionStorage.setItem(KEY, JSON.stringify(state));
}

export function patchCheckout(patch: Partial<CheckoutState>): CheckoutState | null {
  const current = readCheckout();
  if (!current) return null;
  const next = { ...current, ...patch };
  writeCheckout(next);
  return next;
}

export function clearCheckout(): void {
  sessionStorage.removeItem(KEY);
}
