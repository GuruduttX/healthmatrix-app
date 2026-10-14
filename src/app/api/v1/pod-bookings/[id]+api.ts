import { z } from 'zod';

import { requireMember } from '@/server/auth';
import { connectDB } from '@/server/db';
import { HttpError, handle } from '@/server/http';
import { findMobilabBooking, listPods, moveMobilabBooking } from '@/server/mobilab';
import { BookingModel } from '@/server/models';
import { canChangePod, toPodBookingJson } from '@/server/pod-bookings';

const body = z.object({ podId: z.string().min(1, 'Choose a pod') });

/**
 * Moves one of the member's bookings to another pod, while it still waits for them. Mobilab is
 * asked first where the booking stands, so one the pod has already started on isn't moved. Tests
 * can't be changed after booking; Mobilab's API doesn't allow it.
 */
export const PATCH = handle(async (request: Request, { id }: Record<string, string>) => {
  const { podId } = body.parse(await request.json());
  await connectDB();
  const member = await requireMember(request);

  if (!/^[a-f\d]{24}$/i.test(id)) throw new HttpError(404, 'This booking no longer exists');
  const booking = await BookingModel.findOne({ _id: id, member: member._id });
  if (!booking) throw new HttpError(404, 'This booking no longer exists');
  if (booking.pod!.id === podId) return Response.json({ booking: toPodBookingJson(booking) });

  // Where it stands right now, not as of the last check.
  const found = await findMobilabBooking(booking.mobilab!.bookingId);
  if (found) booking.mobilab!.status = found.status;
  booking.mobilab!.checkedAt = new Date();
  if (!canChangePod(booking)) {
    await booking.save();
    throw new HttpError(409, 'The pod has already started on this booking, so it can’t move now.');
  }

  const pod = (await listPods()).find((item) => item.id === podId);
  if (!pod) throw new HttpError(400, 'That pod isn’t taking bookings right now');

  const moved = await moveMobilabBooking(booking.mobilab!.bookingId, pod.id);
  booking.pod = { id: pod.id, name: pod.name };
  booking.mobilab!.status = moved.status;
  await booking.save();
  return Response.json({ booking: toPodBookingJson(booking) });
});
