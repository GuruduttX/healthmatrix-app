import { formatDay, formatTime } from '@/features/reminders/schedule';

/**
 * Consults run on India time, and every time in this feature is shown in it, so a slot reads
 * the same in the list, the booking screen and the confirmation, whatever the phone is set to.
 */
const IST_OFFSET_MS = 330 * 60 * 1000;

/** An instant as India-time day and time: { date: "2026-10-07", time: "17:30" }. */
export function istParts(at: string | Date) {
  const iso = new Date(new Date(at).getTime() + IST_OFFSET_MS).toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
}

/** Today's India-time date. */
export function istToday(now = new Date()) {
  return istParts(now).date;
}

/** "Today, 5:30 PM", "Tomorrow, 10:00 AM", "Sat, 10 Oct, 6:00 PM" */
export function formatSlot(at: string, now = new Date()) {
  const { date, time } = istParts(at);
  return `${formatDay(date, istToday(now))}, ${formatTime(time)}`;
}
