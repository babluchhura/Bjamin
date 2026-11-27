import { Armchair, Navigation } from 'lucide-react';
import type { Seat } from '../types/bus';
import { useI18n } from '../lib/i18n';

type Props = {
  seats: Seat[];
  layout: string;
  selected: string[];
  onToggle: (seatNo: string) => void;
};

function SeatButton({
  seat,
  selected,
  onToggle,
}: {
  seat: Seat;
  selected: boolean;
  onToggle: (seatNo: string) => void;
}) {
  const isBooked = seat.status !== 'available' && !selected;
  const base =
    'relative flex flex-col items-center justify-center rounded-lg border text-[11px] font-bold transition select-none';
  const size = seat.seatType === 'sleeper' ? 'h-14 w-16' : 'h-11 w-11';

  let tone = 'border-slate-200 bg-white text-ink-700 hover:border-brand-400 hover:bg-brand-50';
  if (isBooked) tone = 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400';
  else if (selected) tone = 'border-brand-600 bg-brand-600 text-white shadow-md shadow-brand-600/30';
  else if (seat.isLadies) tone = 'border-pink-200 bg-pink-50 text-pink-700 hover:border-pink-400';

  return (
    <button
      type="button"
      disabled={isBooked}
      onClick={() => onToggle(seat.seatNo)}
      aria-pressed={selected}
      aria-label={`Seat ${seat.seatNo}${seat.isLadies ? ' ladies' : ''} ${isBooked ? 'booked' : selected ? 'selected' : 'available'}`}
      className={`${base} ${size} ${tone}`}
    >
      <span className="leading-none">{seat.seatNo}</span>
      {seat.seatType === 'sleeper' ? <Armchair className="mt-0.5 size-3 opacity-70" /> : null}
      {seat.isLadies && !isBooked ? (
        <span className={`absolute -right-1 -top-1 size-2 rounded-full ${selected ? 'bg-white' : 'bg-pink-500'}`} />
      ) : null}
    </button>
  );
}

function Deck({
  title,
  seats,
  layout,
  selected,
  onToggle,
}: {
  title: string;
  seats: Seat[];
  layout: string;
  selected: string[];
  onToggle: (seatNo: string) => void;
}) {
  const rightCols = layout.includes('2-1') ? 1 : 2;
  const leftCols = 2;
  const perRow = leftCols + rightCols;
  const rows: Seat[][] = [];
  for (let i = 0; i < seats.length; i += perRow) rows.push(seats.slice(i, i + perRow));

  return (
    <div className="rounded-2xl border border-mist-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-ink-500">{title}</p>
        <span className="inline-flex items-center gap-1 text-[11px] text-ink-300">
          <Navigation className="size-3.5" /> Front
        </span>
      </div>
      <div className="flex flex-col items-center gap-2">
        {rows.map((row, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className="flex gap-2">
              {row.slice(0, leftCols).map((seat) => (
                <SeatButton key={seat.id} seat={seat} selected={selected.includes(seat.seatNo)} onToggle={onToggle} />
              ))}
            </div>
            <div className="w-6" />
            <div className="flex gap-2">
              {row.slice(leftCols).map((seat) => (
                <SeatButton key={seat.id} seat={seat} selected={selected.includes(seat.seatNo)} onToggle={onToggle} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SeatMap({ seats, layout, selected, onToggle }: Props) {
  const { t } = useI18n();
  const isSleeper = layout.startsWith('sleeper');
  const lower = seats.filter((s) => s.deck === 'lower');
  const upper = seats.filter((s) => s.deck === 'upper');

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3 text-[11px] font-semibold text-ink-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3.5 rounded border border-slate-300 bg-white" /> {t('seats.legendAvailable')}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3.5 rounded border border-slate-200 bg-slate-100" /> {t('seats.legendBooked')}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3.5 rounded border border-brand-600 bg-brand-600" /> {t('seats.legendSelected')}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3.5 rounded border border-pink-300 bg-pink-50" /> {t('seats.legendLadies')}
        </span>
      </div>

      <div className={`grid gap-4 ${isSleeper ? 'lg:grid-cols-2' : ''}`}>
        <Deck
          title={isSleeper ? t('seats.lowerDeck') : 'Seats'}
          seats={isSleeper ? lower : seats}
          layout={layout}
          selected={selected}
          onToggle={onToggle}
        />
        {isSleeper && upper.length > 0 ? (
          <Deck
            title={t('seats.upperDeck')}
            seats={upper}
            layout={layout}
            selected={selected}
            onToggle={onToggle}
          />
        ) : null}
      </div>
    </div>
  );
}
