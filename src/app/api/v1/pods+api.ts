import { requireMember } from '@/server/auth';
import { connectDB } from '@/server/db';
import { handle } from '@/server/http';
import { listPods } from '@/server/mobilab';

/** Pods that take bookings, from Mobilab, where the tests run. */
export const GET = handle(async (request: Request) => {
  await connectDB();
  await requireMember(request);
  return Response.json({ pods: await listPods() });
});
