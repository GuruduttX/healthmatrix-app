import { requireMember } from '@/server/auth';
import { connectDB } from '@/server/db';
import { handle } from '@/server/http';
import { labCatalog } from '@/server/mobilab';

/** The tests a pod can run and the profiles that group them, from Mobilab. */
export const GET = handle(async (request: Request) => {
  await connectDB();
  await requireMember(request);
  return Response.json(await labCatalog());
});
