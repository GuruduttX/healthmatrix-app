import { type Types } from 'mongoose';

import { type Specialty } from './constants';
import { ConsultModel, type Doctor } from './models';

/**
 * Consult hours. Doctors have no availability of their own yet, so every doctor offers these
 * 30-minute video slots, every day, in India time.
 */
export const CONSULT_MINUTES = 30;
const SESSIONS = [
  { from: '10:00', to: '13:00' },
  { from: '17:00', to: '20:00' },
];
/** Today plus the next six days. */
export const BOOKING_DAYS = 7;
/** A slot can be booked until this long before it starts. */
const LEAD_MS = 5 * 60 * 1000;

export const TIME_ZONE = 'Asia/Kolkata';
/** India has no daylight saving, so its offset never changes. */
const IST_OFFSET_MS = 330 * 60 * 1000;

const pad = (n: number) => String(n).padStart(2, '0');

/** "YYYY-MM-DD" in India, `days` after today. */
function istDateKey(days = 0) {
  return new Date(Date.now() + IST_OFFSET_MS + days * 86_400_000).toISOString().slice(0, 10);
}

/** The instant of an India-time day and "HH:mm". */
function istInstant(date: string, time: string) {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const [hh, mm] = time.split(':').map(Number) as [number, number];
  return new Date(Date.UTC(y, m - 1, d, hh, mm) - IST_OFFSET_MS);
}

function toMinutes(time: string) {
  const [hh, mm] = time.split(':').map(Number) as [number, number];
  return hh * 60 + mm;
}

/** "HH:mm" for every slot in a day. */
const SLOT_TIMES = SESSIONS.flatMap(({ from, to }) => {
  const times: string[] = [];
  for (let t = toMinutes(from); t + CONSULT_MINUTES <= toMinutes(to); t += CONSULT_MINUTES) {
    times.push(`${pad(Math.floor(t / 60))}:${pad(t % 60)}`);
  }
  return times;
});

export type SlotDay = {
  date: string;
  slots: { at: string; time: string; available: boolean }[];
};

/** Instants already taken by a scheduled consult, per doctor. */
async function bookedSlots(doctorIds: Types.ObjectId[]) {
  const consults = await ConsultModel.find({
    doctor: { $in: doctorIds },
    status: 'scheduled',
    scheduledAt: { $gte: new Date(Date.now() - 86_400_000) },
  }).select('doctor scheduledAt');

  const taken = new Map<string, Set<number>>();
  for (const consult of consults) {
    const key = String(consult.doctor);
    if (!taken.has(key)) taken.set(key, new Set());
    taken.get(key)!.add(consult.scheduledAt.getTime());
  }
  return taken;
}

function slotDays(taken: Set<number> | undefined): SlotDay[] {
  const earliest = Date.now() + LEAD_MS;
  return Array.from({ length: BOOKING_DAYS }, (_, day) => {
    const date = istDateKey(day);
    return {
      date,
      slots: SLOT_TIMES.map((time) => ({ time, at: istInstant(date, time) }))
        .filter(({ at }) => at.getTime() >= earliest)
        .map(({ time, at }) => ({
          at: at.toISOString(),
          time,
          available: !taken?.has(at.getTime()),
        })),
    };
  });
}

/** A doctor's bookable week. Past slots today are left out; booked ones are marked taken. */
export async function doctorSlots(doctorId: Types.ObjectId) {
  const taken = await bookedSlots([doctorId]);
  return slotDays(taken.get(String(doctorId)));
}

/** The first free slot for each doctor in the booking window. */
export async function nextFreeSlots(doctorIds: Types.ObjectId[]) {
  const taken = await bookedSlots(doctorIds);
  const next = new Map<string, string>();
  for (const id of doctorIds) {
    const first = slotDays(taken.get(String(id)))
      .flatMap((day) => day.slots)
      .find((slot) => slot.available);
    if (first) next.set(String(id), first.at);
  }
  return next;
}

/** True when `at` is one of the bookable slot instants (whether or not it is free). */
export function isSlotInstant(at: Date) {
  return slotDays(undefined).some((day) => day.slots.some((slot) => slot.at === at.toISOString()));
}

/** "Atul Mishra" -> "Dr Atul Mishra"; names already titled are left alone. */
export function displayName(name: string) {
  return /^dr\.?\s/i.test(name.trim())
    ? name.trim().replace(/^dr\.?\s+/i, 'Dr ')
    : `Dr ${name.trim()}`;
}

/** "delhi" -> "Delhi" */
const titleCase = (text?: string | null) =>
  text ? text.trim().replace(/\b\w/g, (c) => c.toUpperCase()) : undefined;

/** The doctor as the app sees it. Matches `Doctor` in `features/doctors`. Never the phone. */
export function toDoctorJson(doctor: Doctor & { _id: Types.ObjectId }, nextSlot?: string) {
  const city = titleCase(doctor.city);
  const state = titleCase(doctor.state);
  return {
    id: String(doctor._id),
    name: displayName(doctor.name),
    qualifications: doctor.qualifications ?? undefined,
    specialties: doctor.specialties as Specialty[],
    languages: [...new Set((doctor.languages ?? []).map((l) => l.trim()).filter(Boolean))],
    location:
      city && state && city.toLowerCase() !== state.toLowerCase()
        ? `${city}, ${state}`
        : (city ?? state),
    registrationNumber: doctor.registrationNumber,
    council: doctor.council ?? undefined,
    photoUrl: doctor.photoUrl ?? undefined,
    nextSlot,
  };
}
