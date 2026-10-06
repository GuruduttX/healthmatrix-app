import { requireMember } from '@/server/auth';
import { connectDB } from '@/server/db';
import { handle } from '@/server/http';
import { listRecords } from '@/server/records';

/** The member's records timeline, newest first. Prescriptions for now. */
export const GET = handle(async (request: Request) => {
  await connectDB();
  const member = await requireMember(request);
  return Response.json({ records: await listRecords(member._id) });
});
