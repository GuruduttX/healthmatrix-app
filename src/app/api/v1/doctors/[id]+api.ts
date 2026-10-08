import { requireMember } from '@/server/auth';
import { connectDB } from '@/server/db';
import { doctorSlots, TIME_ZONE, toDoctorJson } from '@/server/doctors';
import { handle, HttpError } from '@/server/http';
import { DoctorModel } from '@/server/models';

/** One doctor and their bookable slots, from the hours they set in the console. */
export const GET = handle(async (request: Request, { id }: Record<string, string>) => {
  await connectDB();
  await requireMember(request);

  const doctor = await DoctorModel.findOne({ _id: id, isActive: true });
  if (!doctor || doctor.schedule?.acceptingBookings === false) {
    throw new HttpError(404, 'This doctor is not taking bookings right now');
  }

  const days = await doctorSlots(doctor);
  const nextSlot = days.flatMap((day) => day.slots).find((slot) => slot.available)?.at;
  const json = toDoctorJson(doctor, nextSlot);
  return Response.json({ doctor: json, slotMinutes: json.slotMinutes, timeZone: TIME_ZONE, days });
});
