import { requireMember } from '@/server/auth';
import { connectDB } from '@/server/db';
import { emergencyUrl, ensureQrLink } from '@/server/emergency';
import { handle } from '@/server/http';

/**
 * The signed-in member's emergency QR: the link it encodes and the code inside it.
 * Accounts made before QR codes existed get theirs here, on first ask.
 */
export const GET = handle(async (request: Request) => {
  await connectDB();
  const member = await requireMember(request);
  const link = await ensureQrLink(member._id);
  return Response.json({ qr: { code: link.code, url: emergencyUrl(link.code) } });
});
