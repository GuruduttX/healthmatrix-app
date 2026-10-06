import {
  MEAL_TIMING_LABELS,
  type DateKey,
  type DoseStatus,
  type MedicineReminder,
  type TimeKey,
} from './types';

// Everything here works on the phone's local calendar. Days are "YYYY-MM-DD" keys so that a
// reminder's days never shift with time zones or daylight saving.

const pad = (n: number) => String(n).padStart(2, '0');

export function toDateKey(date: Date): DateKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parts(key: DateKey) {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  return { y, m, d };
}

/** Local midnight of the day. */
export function fromDateKey(key: DateKey) {
  const { y, m, d } = parts(key);
  return new Date(y, m - 1, d);
}

export function addDays(key: DateKey, days: number): DateKey {
  const { y, m, d } = parts(key);
  return toDateKey(new Date(y, m - 1, d + days));
}

/** Whole days from `a` to `b`; negative when `b` is earlier. */
export function daysBetween(a: DateKey, b: DateKey) {
  const pa = parts(a);
  const pb = parts(b);
  return Math.round((Date.UTC(pb.y, pb.m - 1, pb.d) - Date.UTC(pa.y, pa.m - 1, pa.d)) / 86_400_000);
}

function daysInMonth(y: number, m: number) {
  return new Date(y, m, 0).getDate();
}

/** The moment a dose is due, in local time. */
export function doseTime(date: DateKey, time: TimeKey) {
  const { y, m, d } = parts(date);
  const [hh, mm] = time.split(':').map(Number) as [number, number];
  return new Date(y, m - 1, d, hh, mm);
}

/** Whether the reminder has doses on this day. Ignores pausing; see `dosesOn`. */
export function occursOn(reminder: MedicineReminder, date: DateKey) {
  const { startsOn, endsOn } = reminder;
  if (date < startsOn) return false;
  if (reminder.frequency !== 'once' && endsOn && date > endsOn) return false;

  switch (reminder.frequency) {
    case 'once':
      return date === startsOn;
    case 'daily':
      return true;
    case 'weekdays':
      return (reminder.weekdays ?? []).includes(fromDateKey(date).getDay());
    case 'interval':
      return daysBetween(startsOn, date) % Math.max(reminder.everyDays ?? 1, 1) === 0;
    case 'monthly': {
      // Started on the 31st: in a 30-day month it falls on the 30th.
      const { y, m, d } = parts(date);
      return d === Math.min(parts(startsOn).d, daysInMonth(y, m));
    }
  }
}

export type Dose = {
  reminder: MedicineReminder;
  date: DateKey;
  time: TimeKey;
  at: Date;
  status?: DoseStatus;
};

function statusOf(reminder: MedicineReminder, date: DateKey, time: TimeKey) {
  return reminder.log.find((mark) => mark.date === date && mark.time === time)?.status;
}

/** Every dose of the active reminders on one day, earliest first. */
export function dosesOn(reminders: MedicineReminder[], date: DateKey): Dose[] {
  return reminders
    .filter((reminder) => reminder.isActive && occursOn(reminder, date))
    .flatMap((reminder) =>
      reminder.times.map((time) => ({
        reminder,
        date,
        time,
        at: doseTime(date, time),
        status: statusOf(reminder, date, time),
      })),
    )
    .sort((a, b) => a.at.getTime() - b.at.getTime() || a.reminder.name.localeCompare(b.reminder.name));
}

/**
 * Unmarked doses still to come, earliest first, looking at most `horizonDays` ahead.
 * Used to schedule notifications.
 */
export function upcomingDoses(reminders: MedicineReminder[], now: Date, limit: number, horizonDays: number) {
  const today = toDateKey(now);
  const doses: Dose[] = [];
  for (let day = 0; day <= horizonDays && doses.length < limit; day++) {
    for (const dose of dosesOn(reminders, addDays(today, day))) {
      if (dose.at > now && !dose.status) doses.push(dose);
    }
  }
  return doses.slice(0, limit);
}

/** The next unmarked dose of one reminder, within a year. */
export function nextDose(reminder: MedicineReminder, now: Date): Dose | null {
  if (!reminder.isActive) return null;
  return upcomingDoses([reminder], now, 1, 366)[0] ?? null;
}

/** True once the last dose day has passed. */
export function hasEnded(reminder: MedicineReminder, today: DateKey) {
  const last = reminder.frequency === 'once' ? reminder.startsOn : reminder.endsOn;
  return !!last && last < today;
}

// Words

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
export const WEEKDAY_NAMES = WEEKDAY_SHORT;
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** "20:05" -> "8:05 PM" */
export function formatTime(time: TimeKey) {
  const [hh, mm] = time.split(':').map(Number) as [number, number];
  return `${hh % 12 || 12}:${pad(mm)} ${hh < 12 ? 'AM' : 'PM'}`;
}

/** "Today", "Tomorrow", "Yesterday", or "Sat, 10 Oct". */
export function formatDay(date: DateKey, today: DateKey) {
  const offset = daysBetween(today, date);
  if (offset === 0) return 'Today';
  if (offset === 1) return 'Tomorrow';
  if (offset === -1) return 'Yesterday';
  const day = fromDateKey(date);
  return `${WEEKDAY_SHORT[day.getDay()]}, ${day.getDate()} ${MONTH_SHORT[day.getMonth()]}`;
}

/** "10 Oct" */
export function formatShortDate(date: DateKey) {
  const day = fromDateKey(date);
  return `${day.getDate()} ${MONTH_SHORT[day.getMonth()]}`;
}

function ordinal(n: number) {
  const suffix = n % 100 >= 11 && n % 100 <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th');
  return `${n}${suffix}`;
}

/** "Every day", "Mon, Wed, Fri", "Every 3 days", "Monthly on the 5th", "Once on 10 Oct". */
export function describeRepeat(reminder: Pick<MedicineReminder, 'frequency' | 'weekdays' | 'everyDays' | 'startsOn'>) {
  switch (reminder.frequency) {
    case 'once':
      return `Once on ${formatShortDate(reminder.startsOn)}`;
    case 'daily':
      return 'Every day';
    case 'weekdays': {
      const days = [...(reminder.weekdays ?? [])].sort();
      if (days.length === 7) return 'Every day';
      if (days.join() === '1,2,3,4,5') return 'Weekdays';
      if (days.join() === '0,6') return 'Weekends';
      return days.map((d) => WEEKDAY_SHORT[d]).join(', ');
    }
    case 'interval':
      return `Every ${reminder.everyDays ?? 2} days`;
    case 'monthly':
      return `Monthly on the ${ordinal(parts(reminder.startsOn).d)}`;
  }
}

/** "500 mg · After food" */
export function describeDose(reminder: Pick<MedicineReminder, 'dose' | 'mealTiming'>) {
  return [reminder.dose, reminder.mealTiming ? MEAL_TIMING_LABELS[reminder.mealTiming] : null]
    .filter(Boolean)
    .join(' · ');
}

/** "Morning" from 5 am, "Afternoon" from noon, "Evening" from 5 pm, "Night" from 9 pm. */
export function partOfDay(time: TimeKey) {
  const hour = Number(time.slice(0, 2));
  if (hour < 5) return 'Night';
  if (hour < 12) return 'Morning';
  if (hour < 17) return 'Afternoon';
  if (hour < 21) return 'Evening';
  return 'Night';
}
