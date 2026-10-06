import { requireMember } from '@/server/auth';
import { connectDB } from '@/server/db';
import { CONSULT_MINUTES, doctorSlots, TIME_ZONE, toDoctorJson } from '@/server/doctors';
import { handle, HttpError } from '@/server/http';
import { DoctorModel } from '@/server/models';

/** One doctor and their bookable slots for the coming week. */
export const GET = handle(async (request: Request, { id }: Record<string, string>) => {
  await connectDB();
  await requireMember(request);

  const doctor = await DoctorModel.findOne({ _id: id, isActive: true });
  if (!doctor) throw new HttpError(404, 'This doctor is not taking bookings right now');

  const days = await doctorSlots(doctor._id);
  const nextSlot = days.flatMap((day) => day.slots).find((slot) => slot.available)?.at;
  return Response.json({
    doctor: toDoctorJson(doctor, nextSlot),
    slotMinutes: CONSULT_MINUTES,
    timeZone: TIME_ZONE,
    days,
  });
});
