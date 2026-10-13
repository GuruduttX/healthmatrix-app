import { JOIN_OPENS_MS } from '@/features/consult-call/consult-call-api';
import { type Appointment } from '@/features/doctors/types';
import { doseState, type DoseState } from '@/features/reminders/dose-item';
import { type Dose } from '@/features/reminders/schedule';
import { type VaccineDue } from '@/features/reminders/today-timeline';

/** One line on Home's Today card. */
export type TodayItem =
  | { kind: 'consult'; appointment: Appointment; running: boolean; canJoin: boolean }
  | { kind: 'dose'; dose: Dose; state: DoseState }
  | { kind: 'vaccine'; due: VaccineDue };

export type TodaySummary = {
  /** Today's doses, and how many are ticked off. */
  total: number;
  taken: number;
  /** Not marked yet: due now, missed, or later today. */
  dosesLeft: number;
  vaccinesDue: number;
  /** What to show, most pressing first: at most two lines. */
  next: TodayItem[];
  /** Open items that did not make it onto the card. */
  more: number;
  /** Every dose today with where it stands, in time order, for the day strip. */
  doses: { dose: Dose; state: DoseState }[];
};

const OPEN_STATES: DoseState[] = ['due', 'missed', 'later'];

/** Lower is more pressing. */
function rank(item: TodayItem) {
  switch (item.kind) {
    case 'consult':
      return item.canJoin ? 0 : 5;
    case 'dose':
      return item.state === 'due' ? 1 : item.state === 'missed' ? 2 : 6;
    case 'vaccine':
      return item.due.dose.status === 'overdue' ? 3 : 4;
  }
}

type SummaryInput = {
  /** The next scheduled or running consult, if any. */
  consult?: Appointment;
  doses: Dose[];
  vaccinesDue: VaccineDue[];
  now: Date;
  /** Today's date key. */
  today: string;
};

/**
 * What Home's Today card says: how the day's doses are going and the two things to do next. A
 * consult always makes the card, even hours away, because it is the day's one fixed time.
 */
export function summarizeToday({
  consult,
  doses,
  vaccinesDue,
  now,
  today,
}: SummaryInput): TodaySummary {
  const states = doses.map((dose) => ({ dose, state: doseState(dose, now, today) }));
  const open = states.filter(({ state }) => OPEN_STATES.includes(state));

  const consultItem: TodayItem | null = consult
    ? (() => {
        const running = consult.status === 'in_progress';
        const untilStart = new Date(consult.scheduledAt).getTime() - now.getTime();
        return {
          kind: 'consult',
          appointment: consult,
          running,
          canJoin: running || untilStart <= JOIN_OPENS_MS,
        };
      })()
    : null;

  // Sorting is stable, so items of the same rank keep their time order.
  const items: TodayItem[] = [
    ...(consultItem ? [consultItem] : []),
    ...open.map(({ dose, state }): TodayItem => ({ kind: 'dose', dose, state })),
    ...vaccinesDue.map((due): TodayItem => ({ kind: 'vaccine', due })),
  ].sort((a, b) => rank(a) - rank(b));

  let next = items.slice(0, 2);
  if (consultItem && !next.includes(consultItem)) next = [...next.slice(0, 1), consultItem];

  return {
    total: doses.length,
    taken: states.filter(({ state }) => state === 'taken').length,
    dosesLeft: open.length,
    vaccinesDue: vaccinesDue.length,
    next,
    more: items.length - next.length,
    doses: states,
  };
}

/** Time left as numbers and units: 2 h 10 min, 25 min, 3 days. */
export function countdown(ms: number) {
  const minutes = Math.max(Math.round(ms / 60_000), 1);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const rest = minutes % 60;
    return rest ? `${hours} h ${rest} min` : `${hours} h`;
  }
  const days = Math.round(hours / 24);
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}
