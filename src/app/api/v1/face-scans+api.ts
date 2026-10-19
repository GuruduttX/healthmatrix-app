import { requireMember } from '@/server/auth';
import { connectDB } from '@/server/db';
import { faceScanInput, listFaceScans, saveFaceScan } from '@/server/face-scans';
import { handle } from '@/server/http';

/** The member's face scans, newest first. */
export const GET = handle(async (request: Request) => {
  await connectDB();
  const member = await requireMember(request);
  return Response.json({ scans: await listFaceScans(member._id) });
});

/** Keeps a face scan the app just finished, so it shows in history and Ekaay can explain it. */
export const POST = handle(async (request: Request) => {
  const input = faceScanInput.parse(await request.json());
  await connectDB();
  const member = await requireMember(request);
  return Response.json({ scan: await saveFaceScan(member._id, input) }, { status: 201 });
});
