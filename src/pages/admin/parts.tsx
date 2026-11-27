import React from 'react';

export function AdminHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-xl font-semibold text-ink-900 sm:text-2xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-ink-500">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon,
  hint,
  tone = 'brand',
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  hint?: string;
  tone?: 'brand' | 'emerald' | 'amber' | 'rose' | 'slate';
}) {
  const tones: Record<string, string> = {
    brand: 'bg-brand-50 text-brand-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
    slate: 'bg-slate-100 text-slate-600',
  };
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-ink-500">{label}</p>
        <span className={`grid size-8 place-items-center rounded-lg ${tones[tone]}`}>{icon}</span>
      </div>
      <p className="mt-2 font-display text-xl font-bold text-ink-900">{value}</p>
      {hint ? <p className="mt-0.5 text-[11px] text-ink-300">{hint}</p> : null}
    </div>
  );
}

export function TableShell({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-mist-50 text-[11px] uppercase tracking-wider text-ink-500">
            <tr>
              {head.map((h) => (
                <th key={h} className="whitespace-nowrap px-4 py-2.5 font-bold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-mist-100">{children}</tbody>
        </table>
      </div>
    </div>
  );
}

export function Toolbar({ children }: { children: React.ReactNode }) {
  return <div className="mb-3 flex flex-wrap items-center gap-2">{children}</div>;
}

export function IconButton({
  onClick,
  label,
  children,
  tone = 'ghost',
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
  tone?: 'ghost' | 'danger' | 'success';
}) {
  const tones: Record<string, string> = {
    ghost: 'border-mist-200 text-ink-600 hover:border-brand-300 hover:text-brand-700',
    danger: 'border-rose-200 text-rose-600 hover:bg-rose-50',
    success: 'border-emerald-200 text-emerald-700 hover:bg-emerald-50',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`inline-flex size-8 items-center justify-center rounded-lg border bg-white transition ${tones[tone]}`}
    >
      {children}
    </button>
  );
}
