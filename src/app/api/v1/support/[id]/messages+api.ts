import { z } from 'zod';

import { requireMember } from '@/server/auth';
import { connectDB } from '@/server/db';
import { handle, HttpError } from '@/server/http';
import { EnquiryModel } from '@/server/models';
import { ownChat, SUPPORT_MESSAGES_MAX, supportText, toSupportJson } from '@/server/support';

const body = z.object({ text: supportText });

/**
 * Adds the member's message to an open chat, which puts it back at the top of the team's inbox
 * as `unread`. One update, so it can't land in a chat the team ends at the same moment.
 */
export const POST = handle(async (request: Request, { id }: Record<string, string>) => {
  const { text } = body.parse(await request.json());
  await connectDB();
  const member = await requireMember(request);

  const now = new Date();
  const chat = await EnquiryModel.findOneAndUpdate(
    {
      ...ownChat(id, member._id),
      status: { $ne: 'resolved' },
      [`messages.${SUPPORT_MESSAGES_MAX - 1}`]: { $exists: false },
    },
    {
      $push: { messages: { from: 'member', text, at: now } },
      $set: { status: 'unread', memberReadAt: now },
    },
    { returnDocument: 'after' },
  );
  if (chat) return Response.json({ conversation: toSupportJson(chat) }, { status: 201 });

  const current = await EnquiryModel.findOne(ownChat(id, member._id)).select('status');
  if (!current) throw new HttpError(404, 'This chat isn’t here any more');
  if (current.status === 'resolved') {
    throw new HttpError(409, 'This chat has ended. Start a new chat to keep talking to support.');
  }
  throw new HttpError(409, 'This chat is full. End it and start a new one.');
});
