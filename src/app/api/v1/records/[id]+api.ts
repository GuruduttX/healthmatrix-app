import { requireMember } from '@/server/auth';
import { connectDB } from '@/server/db';
import { handle } from '@/server/http';
import { getRecord } from '@/server/records';

/** One prescription in full. Only the member's own. */
export const GET = handle(async (request: Request, { id }: Record<string, string>) => {
  await connectDB();
  const member = await requireMember(request);
  return Response.json({ record: await getRecord(member._id, id) });
});
