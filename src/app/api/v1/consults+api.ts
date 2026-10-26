import { type Types } from 'mongoose';
import { z } from 'zod';

import { requireMember } from '@/server/auth';
import { SPECIALTIES } from '@/server/constants';
import { DOCTOR_FIELDS, toConsultJson, type PopulatedDoctor } from '@/server/consults';
import { connectDB } from '@/server/db';
import { busyTimes, scheduleOf } from '@/server/doctors';
import { handle, HttpError } from '@/server/http';
import { mongoose } from '@/server/mongoose';
import { ConsultModel, DoctorModel, PrescriptionModel } from '@/server/models';
import {
  consultBusy,
  isBookable,
  isMissed,
  LATE_START_MINUTES,
} from '@/server/schedule';

/** How many upcoming consults a member can hold at once. */
const MAX_UPCOMING = 5;
/** A consult the doctor cancelled stays on the list this long, so the member sees why. */
const DOCTOR_CANCEL_SHOWN_MS = 2 * 24 * 60 * 60 * 1000;
/** A consult the doctor started but never ended drops off after this. */
const RUNNING_SHOWN_MS = 12 * 60 * 60 * 1000;
/** The most past consults returned; older ones are still in Records via their prescriptions. */
const PAST_LIMIT = 50;
/** Prescriptions the member never sees. Matches `HIDDEN_STATUSES` in `server/records.ts`. */
const HIDDEN_PRESCRIPTIONS = ['draft', 'cancelled', 'void', 'deleted'];

/**
 * The member's upcoming consults, soonest first: booked ones until `LATE_START_MINUTES` after
 * their start (the patient and the doctor can each join that late), ones the doctor has started,
 * and ones the doctor cancelled in the last two days. Booked ones not started by then are missed
 * and listed with the past consults.
 */
export const GET = handle(async (request: Request) => {
  await connectDB();
  const member = await requireMember(request);
  if (new URL(request.url).searchParams.get('when') === 'past') return pastConsults(member._id);
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

  const shown = consults.filter((consult) => !isMissed(consult, new Date(now)));
  return Response.json({ appointments: shown.map(toConsultJson) });
});

/**
 * `?when=past`: the member's completed consults and missed ones (booked but never started),
 * newest first, each completed one with the prescription the doctor signed in it (its id opens
 * in Records), if there is one.
 */
async function pastConsults(memberId: Types.ObjectId) {
  const missedBefore = new Date(Date.now() - LATE_START_MINUTES * 60_000);
  const consults = await ConsultModel.find({
    member: memberId,
    $or: [{ status: 'completed' }, { status: 'scheduled', scheduledAt: { $lte: missedBefore } }],
  })
    .sort({ scheduledAt: -1 })
    .limit(PAST_LIMIT)
    .populate<PopulatedDoctor>('doctor', DOCTOR_FIELDS);
  const prescriptions = await PrescriptionModel.find({
    member: memberId,
    consult: { $in: consults.map((consult) => consult._id) },
    status: { $nin: HIDDEN_PRESCRIPTIONS },
  })
    .sort({ createdAt: -1 })
    .select('consult');
  const prescriptionFor = new Map<string, string>();
  for (const prescription of prescriptions) {
    const key = String(prescription.consult);
    if (!prescriptionFor.has(key)) prescriptionFor.set(key, String(prescription._id));
  }
  return Response.json({
    consults: consults.map((consult) => ({
      ...toConsultJson(consult),
      prescriptionId: prescriptionFor.get(String(consult._id)),
    })),
  });
}

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
    throw new HttpError(400, 'That time isn’t available any more. Pick another time.');
  }
  const start = at.getTime();
  const end = start + schedule.slotMinutes * 60_000;

  const mine = await ConsultModel.find({
    member: member._id,
    status: { $in: ['scheduled', 'in_progress'] },
    scheduledAt: { $gte: new Date(Date.now() - 2 * 60 * 60 * 1000) },
  }).select('status scheduledAt durationMinutes startedAt');
  // The same rule as the doctor's busy times, so a consult of theirs that runs over counts too.
  const clash = mine.some((consult) => {
    const held = consultBusy(consult);
    return !!held && overlaps(start, end, held);
  });
  if (clash) throw new HttpError(409, 'You already have a consult at that time.');
  if (
    mine.filter((consult) => consult.scheduledAt.getTime() >= Date.now()).length >= MAX_UPCOMING
  ) {
    throw new HttpError(
      400,
      `You can have up to ${MAX_UPCOMING} upcoming consults. Cancel one first.`,
    );
  }

  const slotTaken = () => new HttpError(409, 'Someone has just booked that time. Pick another.');

  let consult: InstanceType<typeof ConsultModel> | undefined;
  try {
    await mongoose.connection.transaction(async (session) => {
      // Two bookings for this doctor at once now conflict on this write. Mongo retries the
      // later one, which then sees the first one's consult and gets the 409. The unique index
      // only catches the same start time, and starts no longer all fall on the same marks.
      await DoctorModel.updateOne(
        { _id: doctor._id },
        { $inc: { bookingVersion: 1 } },
        { session },
      );
      const busy = (await busyTimes([doctor._id], { session })).get(String(doctor._id)) ?? [];
      if (busy.some((taken) => overlaps(start, end, taken))) throw slotTaken();
      [consult] = await ConsultModel.create(
        [
          {
            member: member._id,
            doctor: doctor._id,
            specialty,
            scheduledAt: at,
            durationMinutes: schedule.slotMinutes,
            mode: 'video',
            reason,
          },
        ],
        { session },
      );
    });
  } catch (error) {
    // A second guard: the unique index still lets only one booking per exact start through.
    if ((error as { code?: number }).code === 11000) throw slotTaken();
    throw error;
  }
  if (!consult) throw slotTaken();

  const populated = await consult.populate<PopulatedDoctor>('doctor', DOCTOR_FIELDS);
  return Response.json({ appointment: toConsultJson(populated) }, { status: 201 });
});
