import { z } from "zod";

/**
 * A doctor's bookable hours: weekly sessions, time off and booking rules, all in India time.
 * The patient app books from this and the doctor console edits it, so the file is kept
 * identical in `healthmatrix-app/src/server/schedule.ts` and
 * `healthmatrix-doctor-dashboard/src/lib/schedule.ts`. Change both together. No database or
 * framework code here.
 */

export const TIME_ZONE = "Asia/Kolkata";
/** India has no daylight saving, so its offset never changes. */
const IST_OFFSET_MS = 330 * 60 * 1000;
const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

export type Session = { weekday: number; from: string; to: string };
export type TimeOff = { id?: string; start: Date; end: Date; note?: string };

export type Schedule = {
  acceptingBookings: boolean;
  slotMinutes: number;
  bookingWindowDays: number;
  minNoticeMinutes: number;
  /** Any number of sessions per weekday. A weekday with none is a day off. */
  weekly: Session[];
  timeOff: TimeOff[];
};

export const LIMITS = {
  slotMinutes: { min: 10, max: 60, step: 5 },
  bookingWindowDays: { min: 1, max: 30 },
  minNoticeMinutes: { min: 0, max: 1440 },
  sessionsPerDay: 6,
  timeOff: 100,
} as const;

/** What every doctor offered before schedules existed; doctors who never saved one keep it. */
export const DEFAULT_SCHEDULE: Schedule = {
  acceptingBookings: true,
  slotMinutes: 30,
  bookingWindowDays: 7,
  minNoticeMinutes: 5,
  weekly: [0, 1, 2, 3, 4, 5, 6].flatMap((weekday) => [
    { weekday, from: "10:00", to: "13:00" },
    { weekday, from: "17:00", to: "20:00" },
  ]),
  timeOff: [],
};

/** A consult booked before consults stored their length. */
export const DEFAULT_CONSULT_MINUTES = 30;

// ---------------------------------------------------------------------------
// India-time helpers

const pad = (n: number) => String(n).padStart(2, "0");

/** "YYYY-MM-DD" in India, `days` after the day `now` falls on. */
export function istDateKey(now: Date = new Date(), days = 0) {
  return new Date(now.getTime() + IST_OFFSET_MS + days * DAY_MS).toISOString().slice(0, 10);
}

/** The instant of an India-time day and "HH:mm" ("24:00" is the next midnight). */
export function istInstant(date: string, time: string) {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const [hh, mm] = time.split(":").map(Number) as [number, number];
  return new Date(Date.UTC(y, m - 1, d, hh, mm) - IST_OFFSET_MS);
}

/** 0 (Sunday) to 6 for an India-time day. */
export const weekdayOf = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay();

export function toMinutes(time: string) {
  const [hh, mm] = time.split(":").map(Number) as [number, number];
  return hh * 60 + mm;
}

export const fromMinutes = (minutes: number) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

/** "09:30" -> "9:30 am", "00:00" -> "12:00 am", "24:00" -> "midnight". */
export function clockLabel(time: string) {
  const minutes = toMinutes(time);
  if (minutes === 24 * 60) return "midnight";
  const hours = Math.floor(minutes / 60);
  return `${hours % 12 || 12}:${pad(minutes % 60)} ${hours < 12 ? "am" : "pm"}`;
}

/** An instant as India-time day and minutes since midnight. */
function istParts(at: Date) {
  const shifted = new Date(at.getTime() + IST_OFFSET_MS);
  return { date: shifted.toISOString().slice(0, 10), minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes() };
}

// ---------------------------------------------------------------------------
// Reading a saved schedule

type Maybe<T> = T | null | undefined;

/** The schedule as Mongo returns it: anything can be missing on older doctors. */
export type SavedSchedule = Maybe<{
  acceptingBookings?: Maybe<boolean>;
  slotMinutes?: Maybe<number>;
  bookingWindowDays?: Maybe<number>;
  minNoticeMinutes?: Maybe<number>;
  weekly?: Maybe<{ weekday?: Maybe<number>; from?: Maybe<string>; to?: Maybe<string> }[]>;
  timeOff?: Maybe<{ _id?: unknown; start?: Maybe<Date>; end?: Maybe<Date>; note?: Maybe<string> }[]>;
  /** Set on the first save. Without it the weekly hours are the defaults. */
  updatedAt?: Maybe<Date>;
}>;

const numberOr = (value: Maybe<number>, fallback: number) => (typeof value === "number" ? value : fallback);

/** The saved schedule with defaults filled in. */
export function resolveSchedule(saved: SavedSchedule): Schedule {
  const weekly = saved?.updatedAt
    ? (saved.weekly ?? []).flatMap((s) =>
        typeof s.weekday === "number" && s.from && s.to ? [{ weekday: s.weekday, from: s.from, to: s.to }] : [],
      )
    : DEFAULT_SCHEDULE.weekly;
  const timeOff = (saved?.timeOff ?? []).flatMap((t) =>
    t.start && t.end
      ? [{ id: t._id ? String(t._id) : undefined, start: new Date(t.start), end: new Date(t.end), note: t.note ?? undefined }]
      : [],
  );
  return {
    acceptingBookings: saved?.acceptingBookings !== false,
    slotMinutes: numberOr(saved?.slotMinutes, DEFAULT_SCHEDULE.slotMinutes),
    bookingWindowDays: numberOr(saved?.bookingWindowDays, DEFAULT_SCHEDULE.bookingWindowDays),
    minNoticeMinutes: numberOr(saved?.minNoticeMinutes, DEFAULT_SCHEDULE.minNoticeMinutes),
    weekly: [...weekly].sort((a, b) => a.weekday - b.weekday || toMinutes(a.from) - toMinutes(b.from)),
    timeOff: timeOff.sort((a, b) => a.start.getTime() - b.start.getTime()),
  };
}

// ---------------------------------------------------------------------------
// Slots

/** A time already taken: a booked or running consult. Milliseconds. */
export type Busy = { start: number; end: number };

/** Why a day has no slots: not a working day, time off covers it, or bookings are paused. */
export type DayOff = "weekly" | "time_off" | "paused" | null;

export type SlotDay = {
  date: string;
  off: DayOff;
  slots: { at: string; time: string; available: boolean }[];
};

const overlaps = (aStart: number, aEnd: number, bStart: number, bEnd: number) => aStart < bEnd && bStart < aEnd;

/** Every slot the weekly hours give on one day, before time off and notice are applied. */
function daySlots(schedule: Schedule, date: string) {
  const step = schedule.slotMinutes;
  return schedule.weekly
    .filter((s) => s.weekday === weekdayOf(date))
    .flatMap(({ from, to }) => {
      const times: string[] = [];
      for (let t = toMinutes(from); t + step <= toMinutes(to); t += step) times.push(fromMinutes(t));
      return times;
    })
    .map((time) => {
      const at = istInstant(date, time);
      return { time, at, end: at.getTime() + step * MINUTE_MS };
    });
}

/**
 * The bookable days from today through the booking window. Slots inside time off or within
 * the minimum notice are left out; slots overlapping a booking are marked unavailable.
 */
export function slotDays(schedule: Schedule, busy: Busy[] = [], now: Date = new Date()): SlotDay[] {
  const earliest = now.getTime() + schedule.minNoticeMinutes * MINUTE_MS;
  return Array.from({ length: schedule.bookingWindowDays }, (_, day): SlotDay => {
    const date = istDateKey(now, day);
    if (!schedule.acceptingBookings) return { date, off: "paused", slots: [] };

    const all = daySlots(schedule, date);
    if (all.length === 0) return { date, off: "weekly", slots: [] };

    const working = all.filter(
      (slot) => !schedule.timeOff.some((t) => overlaps(slot.at.getTime(), slot.end, t.start.getTime(), t.end.getTime())),
    );
    if (working.length === 0) return { date, off: "time_off", slots: [] };

    return {
      date,
      off: null,
      slots: working
        .filter((slot) => slot.at.getTime() >= earliest)
        .map((slot) => ({
          at: slot.at.toISOString(),
          time: slot.time,
          available: !busy.some((b) => overlaps(slot.at.getTime(), slot.end, b.start, b.end)),
        })),
    };
  });
}

/** True when `at` is one of the doctor's bookable slot starts right now (free or not). */
export function isBookable(schedule: Schedule, at: Date, now: Date = new Date()) {
  const iso = at.toISOString();
  return slotDays(schedule, [], now).some((day) => day.slots.some((slot) => slot.at === iso));
}

/**
 * Whether a booked consult still sits inside the doctor's hours and outside their time off.
 * The slot grid and booking rules are ignored: changing the slot length clashes with nothing.
 */
export function consultFits(schedule: Schedule, consult: { scheduledAt: Date; durationMinutes?: Maybe<number> }) {
  const minutes = consult.durationMinutes ?? DEFAULT_CONSULT_MINUTES;
  const start = consult.scheduledAt.getTime();
  const end = start + minutes * MINUTE_MS;
  if (schedule.timeOff.some((t) => overlaps(start, end, t.start.getTime(), t.end.getTime()))) return false;

  const { date, minutes: from } = istParts(consult.scheduledAt);
  return schedule.weekly.some(
    (s) => s.weekday === weekdayOf(date) && toMinutes(s.from) <= from && from + minutes <= toMinutes(s.to),
  );
}

// ---------------------------------------------------------------------------
// Validation, for the console's forms

const time = z.string().regex(/^(([01]\d|2[0-3]):[0-5]\d|24:00)$/, "Use a time like 09:30");
const whole = (min: number, max: number, label: string) =>
  z
    .number({ error: `Choose ${label}` })
    .int(`Choose ${label}`)
    .min(min, `${label[0]!.toUpperCase()}${label.slice(1)} can be ${min} at least`)
    .max(max, `${label[0]!.toUpperCase()}${label.slice(1)} can be ${max} at most`);

/** Whether bookings are open, the weekly hours and the booking rules, as the console saves them. */
export const scheduleInput = z
  .object({
    acceptingBookings: z.boolean(),
    slotMinutes: whole(LIMITS.slotMinutes.min, LIMITS.slotMinutes.max, "a slot length").refine(
      (n) => n % LIMITS.slotMinutes.step === 0,
      `Slot length goes in steps of ${LIMITS.slotMinutes.step} minutes`,
    ),
    bookingWindowDays: whole(LIMITS.bookingWindowDays.min, LIMITS.bookingWindowDays.max, "how many days ahead"),
    minNoticeMinutes: whole(LIMITS.minNoticeMinutes.min, LIMITS.minNoticeMinutes.max, "the notice"),
    weekly: z.array(z.object({ weekday: z.number().int().min(0).max(6), from: time, to: time })).max(7 * LIMITS.sessionsPerDay),
  })
  .superRefine((value, ctx) => {
    for (let weekday = 0; weekday < 7; weekday++) {
      const day = WEEKDAYS[weekday];
      const sessions = value.weekly
        .filter((s) => s.weekday === weekday)
        .sort((a, b) => toMinutes(a.from) - toMinutes(b.from));
      if (sessions.length > LIMITS.sessionsPerDay) {
        ctx.addIssue({ code: "custom", message: `${day}: up to ${LIMITS.sessionsPerDay} sessions`, path: ["weekly"] });
      }
      sessions.forEach((s, i) => {
        if (toMinutes(s.from) >= toMinutes(s.to)) {
          ctx.addIssue({ code: "custom", message: `${day}: ${s.from} to ${s.to} ends before it starts`, path: ["weekly"] });
        } else if (toMinutes(s.to) - toMinutes(s.from) < value.slotMinutes) {
          ctx.addIssue({
            code: "custom",
            message: `${day}: ${s.from} to ${s.to} is shorter than one ${value.slotMinutes}-minute slot`,
            path: ["weekly"],
          });
        }
        const next = sessions[i + 1];
        if (next && toMinutes(next.from) < toMinutes(s.to)) {
          ctx.addIssue({ code: "custom", message: `${day}: ${s.from}–${s.to} overlaps ${next.from}–${next.to}`, path: ["weekly"] });
        }
      });
    }
  });

export type ScheduleInput = z.infer<typeof scheduleInput>;

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date");
const note = z
  .string()
  .trim()
  .max(80, "Keep the note under 80 characters")
  .optional()
  .transform((value) => value || undefined);

/** Time off as the console asks for it: whole days, or part of one day. */
export const timeOffInput = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("days"), from: dateKey, to: dateKey, note }),
  z.object({ kind: z.literal("hours"), date: dateKey, from: time, to: time, note }),
]);

export type TimeOffInput = z.input<typeof timeOffInput>;

/** The instants a time-off request covers, or why it can't be used. */
export function timeOffRange(input: z.output<typeof timeOffInput>, now: Date = new Date()) {
  const range =
    input.kind === "days"
      ? { start: istInstant(input.from, "00:00"), end: istInstant(istDateKey(istInstant(input.to, "00:00"), 1), "00:00") }
      : { start: istInstant(input.date, input.from), end: istInstant(input.date, input.to) };
  if (range.start >= range.end) {
    return { error: input.kind === "days" ? "The last day can’t be before the first." : "The end time must be after the start." };
  }
  if (range.end <= now) return { error: "That time has already passed." };
  if (range.end.getTime() - range.start.getTime() > 366 * DAY_MS) return { error: "Time off can be up to a year at once." };
  return { range: { start: range.start, end: range.end, note: input.note } };
}
