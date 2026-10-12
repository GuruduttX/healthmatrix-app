import { requireMember } from '@/server/auth';
import { connectDB } from '@/server/db';
import { requireFamilyMember } from '@/server/family';
import { handle } from '@/server/http';
import { getRecord } from '@/server/records';

/** One of a family member's records in full: a prescription or a vaccine. Read-only. */
export const GET = handle(async (request: Request, { memberId, id }: Record<string, string>) => {
  await connectDB();
  const me = await requireMember(request);
  const { member } = await requireFamilyMember(me._id, memberId);
  return Response.json({ record: await getRecord(member._id, id) });
});
