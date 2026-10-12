import { z } from 'zod';

import { requireMember } from '@/server/auth';
import { SPECIALTIES } from '@/server/constants';
import {
  MAX_PENDING_REQUESTS,
  REQUEST_NOTICE_MS,
  REQUEST_SHOWN_MS,
  toConsultRequestJson,
} from '@/server/consult-requests';
import { DOCTOR_FIELDS, type PopulatedDoctor } from '@/server/consults';
import { connectDB } from '@/server/db';
import { busyTimes, scheduleOf } from '@/server/doctors';
import { handle, HttpError } from '@/server/http';
import { ConsultModel, ConsultRequestModel, DoctorModel } from '@/server/models';
import { consultBusy, istDateKey, START_STEP_MINUTES } from '@/server/schedule';

const STEP_MS = START_STEP_MINUTES * 60_000;

const overlaps = (start: number, end: number, other: { start: number; end: number }) =>
  start < other.end && other.start < end;

/**
 * The member's custom-time requests still worth showing, soonest first: waiting for the doctor,
 * and ones declined or left unanswered in the last two days. Approved ones show as consults.
 */
export const GET = handle(async (request: Request) => {
  await connectDB();
  const member = await requireMember(request);
  const now = Date.now();
  const since = new Date(now - REQUEST_SHOWN_MS);

  const requests = await ConsultRequestModel.find({
    member: member._id,
    $or: [
      { status: 'pending', requestedAt: { $gte: since } },
      { status: 'declined', respondedAt: { $gte: since } },
    ],
  })
    .sort({ requestedAt: 1 })
    .populate<PopulatedDoctor>('doctor', DOCTOR_FIELDS);

  return Response.json({ requests: requests.map((r) => toConsultRequestJson(r, now)) });
});

const body = z.object({
  doctorId: z.string().regex(/^[a-f\d]{24}$/i, 'Choose a doctor'),
  specialty: z.enum(SPECIALTIES, 'Choose a specialty'),
  requestedAt: z.iso.datetime({ message: 'Choose a time' }),
  reason: z
    .string()
    .trim()
    .max(300, 'Keep the reason under 300 letters')
    .transform((value) => value || undefined)
    .optional(),
});

/**
 * Asks a doctor for a time that isn't one of their open slots. Nothing is booked yet: the doctor
 * approves or declines in the console. Refused up front when the doctor or the member already
 * has a consult then.
 */
export const POST = handle(async (request: Request) => {
  const { doctorId, specialty, requestedAt, reason } = body.parse(await request.json());
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
  const now = new Date();
  const at = new Date(requestedAt);
  const start = at.getTime();
  const end = start + schedule.slotMinutes * 60_000;
  if (start % STEP_MS !== 0) {
    throw new HttpError(400, `Pick a time on a ${START_STEP_MINUTES}-minute mark, like 3:25`);
  }
  if (start < now.getTime() + REQUEST_NOTICE_MS) {
    throw new HttpError(
      400,
      'Ask for a time at least 30 minutes from now, so the doctor can reply',
    );
  }
  if (istDateKey(at) > istDateKey(now, schedule.bookingWindowDays - 1)) {
    throw new HttpError(
      400,
      `${doctor.name} takes bookings up to ${schedule.bookingWindowDays} days ahead`,
    );
  }

  const busy = (await busyTimes([doctor._id], { now })).get(String(doctor._id)) ?? [];
  if (busy.some((taken) => overlaps(start, end, taken))) {
    throw new HttpError(409, 'The doctor already has a consult then. Pick another time.');
  }

  const [mine, pending] = await Promise.all([
    ConsultModel.find({
      member: member._id,
      status: { $in: ['scheduled', 'in_progress'] },
      scheduledAt: { $gte: new Date(now.getTime() - 2 * 60 * 60 * 1000) },
    }).select('status scheduledAt durationMinutes startedAt'),
    ConsultRequestModel.find({
      member: member._id,
      status: 'pending',
      requestedAt: { $gt: now },
    }).select('requestedAt durationMinutes'),
  ]);
  if (
    mine.some((consult) => {
      const held = consultBusy(consult, now);
      return !!held && overlaps(start, end, held);
    })
  ) {
    throw new HttpError(409, 'You already have a consult at that time.');
  }
  if (
    pending.some((other) => {
      const from = other.requestedAt.getTime();
      return overlaps(start, end, { start: from, end: from + other.durationMinutes * 60_000 });
    })
  ) {
    throw new HttpError(409, 'You’ve already asked for that time. Wait for the doctor’s answer.');
  }
  if (pending.length >= MAX_PENDING_REQUESTS) {
    throw new HttpError(
      400,
      `You can have ${MAX_PENDING_REQUESTS} requests waiting at once. Withdraw one first.`,
    );
  }

  const created = await ConsultRequestModel.create({
    member: member._id,
    doctor: doctor._id,
    specialty,
    requestedAt: at,
    durationMinutes: schedule.slotMinutes,
    reason,
  });
  const populated = await created.populate<PopulatedDoctor>('doctor', DOCTOR_FIELDS);
  return Response.json({ request: toConsultRequestJson(populated) }, { status: 201 });
});
