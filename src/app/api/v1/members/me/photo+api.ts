import { Buffer } from 'node:buffer';
import { z } from 'zod';

import { randomToken, requireMember, toMemberJson } from '@/server/auth';
import { connectDB } from '@/server/db';
import { handle, HttpError } from '@/server/http';

/** The app resizes photos to 512px before upload, which lands well under this. */
const MAX_BYTES = 300 * 1024;

const body = z.object({ base64: z.string().min(1) });

/** Sets the signed-in member's profile photo from a base64 JPEG. */
export const PUT = handle(async (request: Request) => {
  const { base64 } = body.parse(await request.json());
  const data = Buffer.from(base64.replace(/^data:image\/\w+;base64,/, ''), 'base64');

  if (data.length > MAX_BYTES) throw new HttpError(413, 'That photo is too large');
  // JPEG files start with FF D8 FF.
  if (data[0] !== 0xff || data[1] !== 0xd8 || data[2] !== 0xff) {
    throw new HttpError(400, 'The photo must be a JPEG');
  }

  await connectDB();
  const member = await requireMember(request);
  member.photoKey = randomToken(18);
  member.photoData = data;
  member.photoMimeType = 'image/jpeg';
  await member.save();

  return Response.json({ member: toMemberJson(member) });
});
