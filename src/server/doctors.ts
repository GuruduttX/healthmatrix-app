import { type ClientSession, type Types } from 'mongoose';

import { ConsultModel, type Doctor } from './models';
import {
  consultBusy,
  resolveSchedule,
  slotDays,
  type Busy,
  type SavedSchedule,
  type Schedule,
} from './schedule';

export { TIME_ZONE } from './schedule';

type DoctorDoc = Doctor & { _id: Types.ObjectId };

/** The doctor's bookable hours as set in the console, with defaults filled in. */
export const scheduleOf = (doctor: Pick<Doctor, 'schedule'>): Schedule =>
  resolveSchedule(doctor.schedule as SavedSchedule);

/** A consult that holds its slot: booked, or running now. */
const HOLDS_SLOT = ['scheduled', 'in_progress'] as const;

/** The longest a consult runs; anything that started earlier than this ago is over. */
const LONGEST_MS = 2 * 60 * 60 * 1000;

/**
 * Times already taken by a booked or running consult, per doctor, as `consultBusy` in the shared
 * schedule works them out: a booked consult holds its slot, a running one holds from its start
 * and keeps the next few minutes while it runs over, and an ended one holds nothing. Pass
 * `session` to read inside a booking's transaction.
 */
export async function busyTimes(
  doctorIds: Types.ObjectId[],
  { session, now = new Date() }: { session?: ClientSession; now?: Date } = {},
) {
  const consults = await ConsultModel.find({
    doctor: { $in: doctorIds },
    status: { $in: HOLDS_SLOT },
    scheduledAt: { $gte: new Date(now.getTime() - LONGEST_MS) },
  })
    .select('doctor status scheduledAt durationMinutes startedAt')
    .session(session ?? null);

  const busy = new Map<string, Busy[]>();
  for (const consult of consults) {
    const held = consultBusy(consult, now);
    if (!held) continue;
    const key = String(consult.doctor);
    if (!busy.has(key)) busy.set(key, []);
    busy.get(key)!.push(held);
  }
  return busy;
}

/** A doctor's bookable days. Past slots today are left out; booked ones are marked taken. */
export async function doctorSlots(doctor: DoctorDoc) {
  const now = new Date();
  const busy = await busyTimes([doctor._id], { now });
  return slotDays(scheduleOf(doctor), busy.get(String(doctor._id)), now);
}

/** The first free slot for each doctor in their booking window. */
export async function nextFreeSlots(doctors: DoctorDoc[]) {
  const now = new Date();
  const busy = await busyTimes(
    doctors.map((doctor) => doctor._id),
    { now },
  );
  const next = new Map<string, string>();
  for (const doctor of doctors) {
    const first = slotDays(scheduleOf(doctor), busy.get(String(doctor._id)), now)
      .flatMap((day) => day.slots)
      .find((slot) => slot.available);
    if (first) next.set(String(doctor._id), first.at);
  }
  return next;
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
export function toDoctorJson(doctor: DoctorDoc, nextSlot?: string) {
  const city = titleCase(doctor.city);
  const state = titleCase(doctor.state);
  const schedule = scheduleOf(doctor);
  return {
    id: String(doctor._id),
    name: displayName(doctor.name),
    qualifications: doctor.qualifications ?? undefined,
    specialties: [...new Set((doctor.specialties ?? []).map((s) => s.trim()).filter(Boolean))],
    languages: [...new Set((doctor.languages ?? []).map((l) => l.trim()).filter(Boolean))],
    location:
      city && state && city.toLowerCase() !== state.toLowerCase()
        ? `${city}, ${state}`
        : (city ?? state),
    registrationNumber: doctor.registrationNumber,
    council: doctor.council ?? undefined,
    photoUrl: doctor.photoUrl ?? undefined,
    about: doctor.about?.trim() || undefined,
    experienceYears: doctor.experienceYears ?? undefined,
    slotMinutes: schedule.slotMinutes,
    bookingWindowDays: schedule.bookingWindowDays,
    nextSlot,
  };
}
