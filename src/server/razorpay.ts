import crypto from 'crypto';

export function getRazorpayConfig(): { keyId: string; keySecret: string } | null {
  const keyId = (process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID || '').trim();
  const keySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim();
  if (!keyId || !keySecret) return null;
  return { keyId, keySecret };
}

export function isRazorpayConfigured(): boolean {
  return getRazorpayConfig() !== null;
}

async function razorpayRequest<T>(path: string, init: RequestInit): Promise<T> {
  const config = getRazorpayConfig();
  if (!config) throw new Error('Razorpay is not configured on the server.');
  const auth = Buffer.from(`${config.keyId}:${config.keySecret}`).toString('base64');
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const payload = (await res.json().catch(() => ({}))) as T & { error?: { description?: string } };
  if (!res.ok) {
    throw new Error(payload?.error?.description || `Razorpay request failed (${res.status}).`);
  }
  return payload;
}

export async function createRazorpayOrder(input: {
  amount: number; // rupees
  receipt: string;
  notes?: Record<string, string>;
}) {
  return razorpayRequest<{ id: string; amount: number; currency: string; receipt: string }>('/orders', {
    method: 'POST',
    body: JSON.stringify({
      amount: Math.round(input.amount * 100),
      currency: 'INR',
      receipt: input.receipt,
      payment_capture: 1,
      notes: input.notes || {},
    }),
  });
}

/** Razorpay signs `${order_id}|${payment_id}` with the key secret. */
export function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string): boolean {
  const config = getRazorpayConfig();
  if (!config || !orderId || !paymentId || !signature) return false;
  const expected = crypto
    .createHmac('sha256', config.keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function verifyRazorpayWebhook(rawBody: string, signature: string | undefined): boolean {
  const secret = (process.env.RAZORPAY_WEBHOOK_SECRET || '').trim();
  if (!secret || !signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function refundRazorpayPayment(paymentId: string, amount: number) {
  return razorpayRequest<{ id: string; status: string }>(`/payments/${paymentId}/refund`, {
    method: 'POST',
    body: JSON.stringify({ amount: Math.round(amount * 100), speed: 'normal' }),
  });
}
