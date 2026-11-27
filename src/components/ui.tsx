import React from 'react';
import { Loader2, Star, X } from 'lucide-react';

export function Spinner({ className = 'size-5' }: { className?: string }) {
  return <Loader2 className={`${className} animate-spin`} aria-hidden />;
}

export function PageLoader({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-ink-500">
      <Spinner className="size-7 text-brand-600" />
      <p className="text-sm font-medium">{label || 'Loading…'}</p>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
      {icon ? <div className="grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">{icon}</div> : null}
      <h3 className="text-lg font-semibold text-ink-900">{title}</h3>
      {body ? <p className="max-w-md text-sm text-ink-500">{body}</p> : null}
      {action}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    created: 'bg-sky-50 text-sky-700 border-sky-200',
    failed: 'bg-rose-50 text-rose-700 border-rose-200',
    cancelled: 'bg-slate-100 text-slate-600 border-slate-200',
    refunded: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rejected: 'bg-rose-50 text-rose-700 border-rose-200',
    scheduled: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    logged: 'bg-slate-100 text-slate-600 border-slate-200',
    sent: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${styles[status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
      {status}
    </span>
  );
}

export function Stars({ rating, size = 'size-3.5' }: { rating: number; size?: string }) {
  const rounded = Math.round(rating * 2) / 2;
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${size} ${i <= rounded ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
        />
      ))}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  body,
  align = 'left',
  action,
}: {
  eyebrow?: string;
  title: string;
  body?: string;
  align?: 'left' | 'center';
  action?: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-3 ${align === 'center' ? 'items-center text-center' : 'sm:flex-row sm:items-end sm:justify-between'}`}>
      <div className={align === 'center' ? 'max-w-2xl' : 'max-w-2xl'}>
        {eyebrow ? (
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-brand-600">{eyebrow}</p>
        ) : null}
        <h2 className="text-2xl font-semibold text-ink-900 sm:text-3xl">{title}</h2>
        {body ? <p className="mt-2 text-sm leading-relaxed text-ink-500">{body}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-ink-900/40 p-4 backdrop-blur-sm">
      <div className={`mt-10 w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} rounded-2xl border border-mist-200 bg-white shadow-2xl animate-fade-up`}>
        <div className="flex items-center justify-between border-b border-mist-200 px-5 py-4">
          <h3 className="text-base font-semibold">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-ink-500 hover:bg-mist-100">
            <X className="size-4" />
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[11px] text-ink-300">{hint}</span> : null}
    </label>
  );
}

export function SkeletonRows({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton h-32 w-full" />
      ))}
    </div>
  );
}
