import { z } from 'zod';

import { requireMember } from '@/server/auth';
import { SPECIALTIES } from '@/server/constants';
import { DOCTOR_FIELDS, toConsultJson, type PopulatedDoctor } from '@/server/consults';
import { connectDB } from '@/server/db';
import { CONSULT_MINUTES, isSlotInstant } from '@/server/doctors';
import { handle, HttpError } from '@/server/http';
import { ConsultModel, DoctorModel } from '@/server/models';

/** How many upcoming consults a member can hold at once. */
const MAX_UPCOMING = 5;

/** The member's upcoming consults, soonest first. One in progress stays until its slot ends. */
export const GET = handle(async (request: Request) => {
  await connectDB();
  const member = await requireMember(request);

  const consults = await ConsultModel.find({
    member: member._id,
    status: { $in: ['scheduled', 'in_progress'] },
    scheduledAt: { $gte: new Date(Date.now() - CONSULT_MINUTES * 60 * 1000) },
  })
    .sort({ scheduledAt: 1 })
    .populate<PopulatedDoctor>('doctor', DOCTOR_FIELDS);

  return Response.json({ appointments: consults.map(toConsultJson) });
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

/** Books a video consult in one of the doctor's free slots. */
export const POST = handle(async (request: Request) => {
  const { doctorId, specialty, scheduledAt, reason } = booking.parse(await request.json());
  await connectDB();
  const member = await requireMember(request);

  const doctor = await DoctorModel.findOne({ _id: doctorId, isActive: true });
  if (!doctor) throw new HttpError(404, 'This doctor is not taking bookings right now');
  if (!doctor.specialties.includes(specialty)) {
    throw new HttpError(400, 'This doctor does not offer that specialty');
  }

  const at = new Date(scheduledAt);
  if (!isSlotInstant(at)) {
    throw new HttpError(400, 'That time is not available any more. Pick another slot.');
  }

  const upcoming = await ConsultModel.find({
    member: member._id,
    status: 'scheduled',
    scheduledAt: { $gte: new Date() },
  }).select('scheduledAt');
  if (upcoming.some((consult) => consult.scheduledAt.getTime() === at.getTime())) {
    throw new HttpError(409, 'You already have a consult at that time.');
  }
  if (upcoming.length >= MAX_UPCOMING) {
    throw new HttpError(
      400,
      `You can have up to ${MAX_UPCOMING} upcoming consults. Cancel one first.`,
    );
  }

  const slotTaken = () =>
    new HttpError(409, 'Someone has just booked that slot. Pick another time.');
  if (await ConsultModel.exists({ doctor: doctor._id, scheduledAt: at, status: 'scheduled' })) {
    throw slotTaken();
  }

  let consult;
  try {
    consult = await ConsultModel.create({
      member: member._id,
      doctor: doctor._id,
      specialty,
      scheduledAt: at,
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
