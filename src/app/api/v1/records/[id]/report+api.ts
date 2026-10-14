import { requireMember } from '@/server/auth';
import { connectDB } from '@/server/db';
import { handle } from '@/server/http';
import { screeningReportUrl } from '@/server/records';

/** A fresh link to a pod screening's PDF report, to open in the browser. Only the member's own. */
export const GET = handle(async (request: Request, { id }: Record<string, string>) => {
  await connectDB();
  const member = await requireMember(request);
  return Response.json({ url: await screeningReportUrl(member._id, id) });
});
