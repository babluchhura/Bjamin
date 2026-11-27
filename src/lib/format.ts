const IST_OFFSET_MS = 330 * 60 * 1000; // Asia/Kolkata, UTC+05:30
const TIME_ZONE = 'Asia/Kolkata';

/** Calendar parts of an instant, as seen in India. */
function istParts(value: Date) {
  const shifted = new Date(value.getTime() + IST_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    hours: shifted.getUTCHours(),
    minutes: shifted.getUTCMinutes(),
  };
}

export function formatINR(amount: number): string {
  return `₹${Math.round(amount || 0).toLocaleString('en-IN')}`;
}

export function formatDate(value: string | Date | null | undefined, style: 'short' | 'long' = 'short'): string {
  if (!value) return '';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', {
    timeZone: TIME_ZONE,
    ...(style === 'long'
      ? { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' }
      : { day: '2-digit', month: 'short', year: 'numeric' }),
  });
}

export function formatTime(value: string | Date | null | undefined): string {
  if (!value) return '';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-IN', {
    timeZone: TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '';
  return `${formatDate(value)} · ${formatTime(value)}`;
}

export function durationLabel(minutes: number): string {
  if (!minutes || minutes < 0) return '';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function tripDuration(departAt: string, arriveAt: string): string {
  const ms = new Date(arriveAt).getTime() - new Date(departAt).getTime();
  return durationLabel(Math.round(ms / 60000));
}

/** Number of calendar days between departure and arrival in India. */
export function dayOffset(departAt: string, arriveAt: string): number {
  const a = istParts(new Date(departAt));
  const b = istParts(new Date(arriveAt));
  const start = Date.UTC(a.year, a.month, a.day);
  const end = Date.UTC(b.year, b.month, b.day);
  return Math.max(0, Math.round((end - start) / 86400000));
}

/** `YYYY-MM-DD` for an instant, in India. */
export function toInputDate(date: Date): string {
  const p = istParts(date);
  return `${p.year}-${String(p.month + 1).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

export function todayInput(): string {
  return toInputDate(new Date());
}

export function tomorrowInput(): string {
  return toInputDate(new Date(Date.now() + 86400000));
}

export function relativeLabel(value: string | Date): string {
  const target = new Date(value).getTime();
  const diff = target - Date.now();
  if (diff < 0) return 'Departed';
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return `in ${Math.max(1, Math.round(diff / 60000))} min`;
  if (hours < 24) return `in ${hours} hr`;
  return `in ${Math.round(hours / 24)} day(s)`;
}
