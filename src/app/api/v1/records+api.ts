import { requireMember } from '@/server/auth';
import { connectDB } from '@/server/db';
import { handle } from '@/server/http';
import { syncMemberBookings } from '@/server/pod-bookings';
import { listRecords } from '@/server/records';

/**
 * The member's records timeline, newest first. Pod bookings still waiting are checked first, so
 * results that just came in are on it.
 */
export const GET = handle(async (request: Request) => {
  await connectDB();
  const member = await requireMember(request);
  await syncMemberBookings(member);
  return Response.json({ records: await listRecords(member._id) });
});
