import { connectDB } from '@/server/db';
import { handle, HttpError } from '@/server/http';
import { MemberModel } from '@/server/models';

/** A member's profile photo. The key changes on every upload, so the response never goes stale. */
export const GET = handle(async (_request: Request, { key }: Record<string, string>) => {
  await connectDB();
  const member = await MemberModel.findOne({ photoKey: key }).select('+photoData +photoMimeType');
  if (!member?.photoData) throw new HttpError(404, 'No photo');

  return new Response(new Uint8Array(member.photoData), {
    headers: {
      'Content-Type': member.photoMimeType ?? 'image/jpeg',
      'Cache-Control': 'private, max-age=31536000, immutable',
    },
  });
});
