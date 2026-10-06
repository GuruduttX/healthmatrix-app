import { type Types } from 'mongoose';
import { z } from 'zod';

import { DOSE_STATUSES, MEAL_TIMINGS, REMINDER_FREQUENCIES } from './constants';
import { HttpError } from './http';
import { ReminderModel, type Reminder } from './models';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** "2026-02-30" passes the pattern but is not a day. */
function isRealDate(key: string) {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export const dateKey = z
  .string()
  .regex(DATE_PATTERN, 'Pick a valid date')
  .refine(isRealDate, 'Pick a valid date');

export const timeKey = z.string().regex(TIME_PATTERN, 'Pick a valid time');

const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .transform((value) => value || undefined)
    .nullish();

/** A medicine reminder as the app sends it, whole. A change is merged onto the saved one first. */
export const reminderInput = z
  .object({
    name: z.string().trim().min(1, 'Enter the medicine name').max(60, 'Keep the name under 60 letters'),
    dose: optionalText(40, 'Keep the dose under 40 letters'),
    mealTiming: z.enum(MEAL_TIMINGS).nullish(),
    note: optionalText(120, 'Keep the note under 120 letters'),
    times: z
      .array(timeKey)
      .min(1, 'Add at least one time')
      .max(8, 'Add up to 8 times a day')
      .transform((times) => [...new Set(times)].sort()),
    frequency: z.enum(REMINDER_FREQUENCIES),
    weekdays: z
      .array(z.number().int().min(0).max(6))
      .nullish()
      .transform((days) => (days ? [...new Set(days)].sort() : undefined)),
    everyDays: z.number().int().min(2, 'Repeat every 2 days or more').max(90).nullish(),
    startsOn: dateKey,
    endsOn: dateKey.nullish(),
    isActive: z.boolean().default(true),
  })
  .superRefine((value, ctx) => {
    if (value.frequency === 'weekdays' && !value.weekdays?.length) {
      ctx.addIssue({ code: 'custom', message: 'Pick at least one day of the week', path: ['weekdays'] });
    }
    if (value.frequency === 'interval' && !value.everyDays) {
      ctx.addIssue({ code: 'custom', message: 'Choose how many days apart', path: ['everyDays'] });
    }
    // "YYYY-MM-DD" strings sort the same way as the days they name.
    if (value.frequency !== 'once' && value.endsOn && value.endsOn < value.startsOn) {
      ctx.addIssue({ code: 'custom', message: 'The end date is before the start date', path: ['endsOn'] });
    }
  })
  // Drop settings that do not apply to the chosen repeat, so stale ones never come back.
  .transform((value) => ({
    ...value,
    weekdays: value.frequency === 'weekdays' ? value.weekdays : undefined,
    everyDays: value.frequency === 'interval' ? (value.everyDays ?? undefined) : undefined,
    endsOn: value.frequency === 'once' ? undefined : (value.endsOn ?? undefined),
  }));

export type ReminderInput = z.infer<typeof reminderInput>;

/** The fields to write for a validated input. */
export function toReminderFields(input: ReminderInput) {
  return {
    title: input.name,
    dose: input.dose ?? undefined,
    mealTiming: input.mealTiming ?? undefined,
    note: input.note ?? undefined,
    times: input.times,
    frequency: input.frequency,
    weekdays: input.weekdays,
    everyDays: input.everyDays,
    startsOn: input.startsOn,
    endsOn: input.endsOn,
    isActive: input.isActive,
  };
}

export const doseInput = z.object({
  date: dateKey,
  time: timeKey,
  /** `null` clears the mark. */
  status: z.enum(DOSE_STATUSES).nullable(),
});

/** "YYYY-MM-DD", `days` before today in UTC. Close enough for trimming old history. */
function daysAgoKey(days: number) {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

/** Dose history kept on the reminder; older marks are dropped on the next write. */
export const LOG_KEEP_DAYS = 180;
/** Dose history sent to the app. */
const LOG_SEND_DAYS = 62;

export function trimLog<T extends { date: string }>(log: T[]) {
  const cutoff = daysAgoKey(LOG_KEEP_DAYS);
  return log.filter((entry) => entry.date >= cutoff);
}

/** The reminder as the app sees it. Matches `MedicineReminder` in `features/reminders`. */
export function toReminderJson(reminder: Reminder & { _id: Types.ObjectId }) {
  const cutoff = daysAgoKey(LOG_SEND_DAYS);
  return {
    id: String(reminder._id),
    name: reminder.title,
    dose: reminder.dose ?? undefined,
    mealTiming: reminder.mealTiming ?? undefined,
    note: reminder.note ?? undefined,
    times: reminder.times ?? [],
    frequency: reminder.frequency ?? 'daily',
    weekdays: reminder.weekdays?.length ? reminder.weekdays : undefined,
    everyDays: reminder.everyDays ?? undefined,
    startsOn: reminder.startsOn ?? '',
    endsOn: reminder.endsOn ?? undefined,
    isActive: reminder.isActive,
    log: reminder.log
      .filter((entry) => entry.date >= cutoff)
      .map(({ date, time, status }) => ({ date, time, status })),
  };
}

/** The member's own medicine reminder, or a 404. */
export async function findOwnReminder(memberId: Types.ObjectId, id: string) {
  const reminder = await ReminderModel.findOne({ _id: id, member: memberId, kind: 'medicine' });
  if (!reminder) throw new HttpError(404, 'This reminder no longer exists');
  return reminder;
}
