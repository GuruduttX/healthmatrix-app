import { z } from 'zod';

import { requireMember } from '@/server/auth';
import { connectDB } from '@/server/db';
import { HttpError, handle } from '@/server/http';
import { createMobilabBooking, findMobilabBooking, listPods } from '@/server/mobilab';
import { BookingModel } from '@/server/models';
import {
  newBookingId,
  selectTests,
  syncMemberBookings,
  toPodBookingJson,
} from '@/server/pod-bookings';

/** The signed-in member's pod bookings, newest first, the waiting ones checked with Mobilab. */
export const GET = handle(async (request: Request) => {
  await connectDB();
  const member = await requireMember(request);
  await syncMemberBookings(member);
  const bookings = await BookingModel.find({ member: member._id }).sort({ createdAt: -1 }).limit(20);
  return Response.json({ bookings: bookings.map(toPodBookingJson) });
});

const body = z.object({
  podId: z.string().min(1, 'Choose a pod'),
  profileIds: z.array(z.string()).max(20).default([]),
  testCodes: z.array(z.string()).max(60).default([]),
  /** Asked for once when the member has none on file; saved to their profile. */
  dateOfBirth: z.iso.date('Enter your date of birth').optional(),
  /** For the lab's reference ranges. Asked when the member's gender isn't male or female. */
  sex: z.enum(['male', 'female']).optional(),
});

/**
 * Books tests at a pod for the signed-in member. Walk-in: the booking goes straight into the pod's
 * queue on Mobilab, and the member is tested whenever they arrive.
 */
export const POST = handle(async (request: Request) => {
  const input = body.parse(await request.json());
  await connectDB();
  const member = await requireMember(request);

  const dateOfBirth = input.dateOfBirth ? new Date(input.dateOfBirth) : member.dateOfBirth;
  if (!dateOfBirth) throw new HttpError(400, 'Enter your date of birth');
  const age = (Date.now() - dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  if (age < 0 || age > 120) throw new HttpError(400, 'Check your date of birth');

  const gender = member.gender;
  const sex = input.sex ?? (gender === 'male' || gender === 'female' ? gender : undefined);
  if (!sex) throw new HttpError(400, 'Choose the sex the lab should use');

  const pod = (await listPods()).find((item) => item.id === input.podId);
  if (!pod) throw new HttpError(400, 'That pod isn’t taking bookings right now');
  const tests = await selectTests(input.profileIds, input.testCodes);

  if (input.dateOfBirth) {
    member.dateOfBirth = dateOfBirth;
    await member.save();
  }

  // Saved first, so a booking Mobilab accepted is never lost if its reply goes missing. Removed
  // again only when Mobilab doesn't have it.
  const booking = await BookingModel.create({
    member: member._id,
    pod: { id: pod.id, name: pod.name },
    profiles: tests.profileNames,
    tests: tests.allTests,
    sex,
    mobilab: { bookingId: newBookingId() },
  });

  const reference = booking.mobilab!.bookingId;
  try {
    const created = await createMobilabBooking({
      bookingId: reference,
      podId: pod.id,
      patient: {
        name: member.name,
        phone: member.phone,
        dateOfBirth: dateOfBirth.toISOString().slice(0, 10),
        sex,
      },
      profileCodes: tests.profileCodes,
      testCodes: tests.testCodes,
    });
    booking.mobilab!.id = created.id;
    booking.mobilab!.status = created.status;
  } catch (error) {
    // A timeout may still have reached Mobilab: keep the booking if it got there.
    const found = await findMobilabBooking(reference).catch(() => null);
    if (!found) {
      await BookingModel.deleteOne({ _id: booking._id });
      throw error;
    }
    booking.mobilab!.id = found.id;
    booking.mobilab!.status = found.status;
  }
  await booking.save();

  return Response.json({ booking: toPodBookingJson(booking) }, { status: 201 });
});
