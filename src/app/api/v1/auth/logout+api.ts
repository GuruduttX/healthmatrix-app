import { requireSession } from '@/server/auth';
import { connectDB } from '@/server/db';
import { handle } from '@/server/http';

/** Ends the session behind this request's token. */
export const POST = handle(async (request: Request) => {
  await connectDB();
  const session = await requireSession(request);
  await session.deleteOne();
  return new Response(null, { status: 204 });
});
