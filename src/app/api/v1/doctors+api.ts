import { z } from 'zod';

import { requireMember } from '@/server/auth';
import { SPECIALTIES } from '@/server/constants';
import { connectDB } from '@/server/db';
import { nextFreeSlots, toDoctorJson } from '@/server/doctors';
import { handle } from '@/server/http';
import { DoctorModel } from '@/server/models';

const query = z.object({ specialty: z.enum(SPECIALTIES, 'Choose a specialty') });

/**
 * Active doctors in one specialty, soonest available first, each with their next free slot.
 * Doctors who paused bookings in the console are left out.
 */
export const GET = handle(async (request: Request) => {
  const { specialty } = query.parse(Object.fromEntries(new URL(request.url).searchParams));
  await connectDB();
  await requireMember(request);

  const doctors = await DoctorModel.find({
    isActive: true,
    specialties: specialty,
    'schedule.acceptingBookings': { $ne: false },
  }).sort({ name: 1 });
  const next = await nextFreeSlots(doctors);

  const list = doctors.map((doctor) => toDoctorJson(doctor, next.get(String(doctor._id))));
  // Doctors with a free slot first, the earliest at the top.
  list.sort((a, b) => (a.nextSlot ?? '~').localeCompare(b.nextSlot ?? '~'));
  return Response.json({ doctors: list });
});
