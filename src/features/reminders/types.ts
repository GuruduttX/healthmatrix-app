/** Mirrors `src/server/constants.ts` and `toReminderJson` in `src/server/reminders.ts`. */

export type Frequency = 'once' | 'daily' | 'weekdays' | 'interval' | 'monthly';

export type MealTiming = 'before_food' | 'after_food' | 'with_food' | 'empty_stomach';

export type DoseStatus = 'taken' | 'skipped';

/** A local calendar day, "2026-10-06". */
export type DateKey = string;

/** A local time of day, "20:00". */
export type TimeKey = string;

export type DoseMark = { date: DateKey; time: TimeKey; status: DoseStatus };

export type MedicineReminder = {
  id: string;
  name: string;
  dose?: string;
  mealTiming?: MealTiming;
  note?: string;
  /** Sorted. */
  times: TimeKey[];
  frequency: Frequency;
  /** For "weekdays": 0 is Sunday. */
  weekdays?: number[];
  /** For "interval": every this many days from `startsOn`. */
  everyDays?: number;
  startsOn: DateKey;
  endsOn?: DateKey;
  isActive: boolean;
  /** Marks from about the last two months. */
  log: DoseMark[];
};

/** What the form sends. `null` clears an optional field. */
export type ReminderDraft = {
  name: string;
  dose?: string | null;
  mealTiming?: MealTiming | null;
  note?: string | null;
  times: TimeKey[];
  frequency: Frequency;
  weekdays?: number[] | null;
  everyDays?: number | null;
  startsOn: DateKey;
  endsOn?: DateKey | null;
  isActive?: boolean;
};

export const MEAL_TIMING_LABELS: Record<MealTiming, string> = {
  before_food: 'Before food',
  after_food: 'After food',
  with_food: 'With food',
  empty_stomach: 'Empty stomach',
};
