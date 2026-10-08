import { z } from 'zod';

import { requireMember } from '@/server/auth';
import { SPECIALTIES } from '@/server/constants';
import { DOCTOR_FIELDS, toConsultJson, type PopulatedDoctor } from '@/server/consults';
import { connectDB } from '@/server/db';
import { busyTimes, scheduleOf } from '@/server/doctors';
import { handle, HttpError } from '@/server/http';
import { ConsultModel, DoctorModel } from '@/server/models';
import { DEFAULT_CONSULT_MINUTES, isBookable } from '@/server/schedule';

/** How many upcoming consults a member can hold at once. */
const MAX_UPCOMING = 5;
/** A consult the doctor cancelled stays on the list this long, so the member sees why. */
const DOCTOR_CANCEL_SHOWN_MS = 2 * 24 * 60 * 60 * 1000;
/** A consult the doctor started but never ended drops off after this. */
const RUNNING_SHOWN_MS = 12 * 60 * 60 * 1000;

const minutesOf = (consult: { durationMinutes?: number | null }) =>
  consult.durationMinutes ?? DEFAULT_CONSULT_MINUTES;

/**
 * The member's upcoming consults, soonest first: booked ones until their slot ends, ones the
 * doctor has started, and ones the doctor cancelled in the last two days.
 */
export const GET = handle(async (request: Request) => {
  await connectDB();
  const member = await requireMember(request);
  const now = Date.now();

  const consults = await ConsultModel.find({
    member: member._id,
    $or: [
      { status: 'scheduled', scheduledAt: { $gte: new Date(now - 2 * 60 * 60 * 1000) } },
      { status: 'in_progress', scheduledAt: { $gte: new Date(now - RUNNING_SHOWN_MS) } },
      {
        status: 'cancelled',
        cancelledBy: 'doctor',
        cancelledAt: { $gte: new Date(now - DOCTOR_CANCEL_SHOWN_MS) },
      },
    ],
  })
    .sort({ scheduledAt: 1 })
    .populate<PopulatedDoctor>('doctor', DOCTOR_FIELDS);

  const shown = consults.filter(
    (consult) =>
      consult.status !== 'scheduled' ||
      consult.scheduledAt.getTime() + minutesOf(consult) * 60_000 > now,
  );
  return Response.json({ appointments: shown.map(toConsultJson) });
});

const booking = z.object({
  doctorId: z.string().regex(/^[a-f\d]{24}$/i, 'Choose a doctor'),
  specialty: z.enum(SPECIALTIES, 'Choose a specialty'),
  scheduledAt: z.iso.datetime({ message: 'Choose a time' }),
  reason: z
    .string()
    .trim()
    .max(300, 'Keep the reason under 300 letters')
    .transform((value) => value || undefined)
    .optional(),
});

const overlaps = (start: number, end: number, other: { start: number; end: number }) =>
  start < other.end && other.start < end;

/** Books a video consult in one of the doctor's free slots, as set in the console. */
export const POST = handle(async (request: Request) => {
  const { doctorId, specialty, scheduledAt, reason } = booking.parse(await request.json());
  await connectDB();
  const member = await requireMember(request);

  const doctor = await DoctorModel.findOne({ _id: doctorId, isActive: true });
  if (!doctor || doctor.schedule?.acceptingBookings === false) {
    throw new HttpError(404, 'This doctor is not taking bookings right now');
  }
  if (!doctor.specialties.includes(specialty)) {
    throw new HttpError(400, 'This doctor does not offer that specialty');
  }

  const schedule = scheduleOf(doctor);
  const at = new Date(scheduledAt);
  if (!isBookable(schedule, at)) {
    throw new HttpError(400, 'That time is not available any more. Pick another slot.');
  }
  const start = at.getTime();
  const end = start + schedule.slotMinutes * 60_000;

  const mine = await ConsultModel.find({
    member: member._id,
    status: { $in: ['scheduled', 'in_progress'] },
    scheduledAt: { $gte: new Date(Date.now() - 2 * 60 * 60 * 1000) },
  }).select('scheduledAt durationMinutes');
  const clash = mine.some((consult) => {
    const from = consult.scheduledAt.getTime();
    return overlaps(start, end, { start: from, end: from + minutesOf(consult) * 60_000 });
  });
  if (clash) throw new HttpError(409, 'You already have a consult at that time.');
  if (mine.filter((consult) => consult.scheduledAt.getTime() >= Date.now()).length >= MAX_UPCOMING) {
    throw new HttpError(
      400,
      `You can have up to ${MAX_UPCOMING} upcoming consults. Cancel one first.`,
    );
  }

  const slotTaken = () =>
    new HttpError(409, 'Someone has just booked that slot. Pick another time.');
  const busy = (await busyTimes([doctor._id])).get(String(doctor._id)) ?? [];
  if (busy.some((taken) => overlaps(start, end, taken))) throw slotTaken();

  let consult;
  try {
    consult = await ConsultModel.create({
      member: member._id,
      doctor: doctor._id,
      specialty,
      scheduledAt: at,
      durationMinutes: schedule.slotMinutes,
      mode: 'video',
      reason,
    });
  } catch (error) {
    // Two bookings for the same slot at once: the unique index lets only one through.
    if ((error as { code?: number }).code === 11000) throw slotTaken();
    throw error;
  }

  const populated = await consult.populate<PopulatedDoctor>('doctor', DOCTOR_FIELDS);
  return Response.json({ appointment: toConsultJson(populated) }, { status: 201 });
});
