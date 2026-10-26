import { z } from 'zod';

import { requireMember } from '@/server/auth';
import { connectDB } from '@/server/db';
import { handle, HttpError } from '@/server/http';
import { EnquiryModel } from '@/server/models';
import { ownChat, toSupportJson } from '@/server/support';

/**
 * One chat, every line. The app asks every few seconds while it's open, which is how the team's
 * replies arrive; each ask marks them read. Reading doesn't touch `updatedAt`, which the admin
 * sorts its inbox by.
 */
export const GET = handle(async (request: Request, { id }: Record<string, string>) => {
  await connectDB();
  const member = await requireMember(request);
  const chat = await EnquiryModel.findOneAndUpdate(
    ownChat(id, member._id),
    { $set: { memberReadAt: new Date() } },
    { returnDocument: 'after', timestamps: false },
  );
  if (!chat) throw new HttpError(404, 'This chat isn’t here any more');
  return Response.json({ conversation: toSupportJson(chat) });
});

const change = z.object({ status: z.literal('ended', 'Only ending a chat is supported') });

/** Ends the chat from the member's side. Ending one that has already ended changes nothing. */
export const PATCH = handle(async (request: Request, { id }: Record<string, string>) => {
  change.parse(await request.json());
  await connectDB();
  const member = await requireMember(request);

  const now = new Date();
  const chat =
    (await EnquiryModel.findOneAndUpdate(
      { ...ownChat(id, member._id), status: { $ne: 'resolved' } },
      { $set: { status: 'resolved', endedAt: now, endedBy: 'member', memberReadAt: now } },
      { returnDocument: 'after' },
    )) ?? (await EnquiryModel.findOne(ownChat(id, member._id)));
  if (!chat) throw new HttpError(404, 'This chat isn’t here any more');
  return Response.json({ conversation: toSupportJson(chat) });
});
