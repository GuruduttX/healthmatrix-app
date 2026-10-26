import { z } from 'zod';

import { requireMember } from '@/server/auth';
import { SUPPORT_TOPICS } from '@/server/constants';
import { connectDB } from '@/server/db';
import { handle, HttpError } from '@/server/http';
import { EnquiryModel } from '@/server/models';
import {
  SUPPORT_LISTED,
  supportText,
  toSupportJson,
  toSupportSummaryJson,
} from '@/server/support';

/** The member's support chats, the latest first: at most one open, then the past ones. */
export const GET = handle(async (request: Request) => {
  await connectDB();
  const member = await requireMember(request);
  const chats = await EnquiryModel.find({ type: 'support', member: member._id })
    .sort({ updatedAt: -1 })
    .limit(SUPPORT_LISTED);
  return Response.json({ conversations: chats.map(toSupportSummaryJson) });
});

const start = z.object({
  topic: z.enum(SUPPORT_TOPICS, 'Choose what it’s about'),
  text: supportText,
});

/**
 * Starts a chat with the support team, filed as a `support` enquiry for the admin to answer.
 * One at a time: the member ends the open one before starting another.
 */
export const POST = handle(async (request: Request) => {
  const { topic, text } = start.parse(await request.json());
  await connectDB();
  const member = await requireMember(request);

  const open = await EnquiryModel.exists({
    type: 'support',
    member: member._id,
    status: { $ne: 'resolved' },
  });
  if (open) {
    throw new HttpError(409, 'You already have a chat open with support. Continue it, or end it first.');
  }

  const now = new Date();
  const chat = await EnquiryModel.create({
    type: 'support',
    source: 'app',
    name: member.name,
    email: member.email ?? '',
    phone: member.phone,
    memberId: member.memberId,
    member: member._id,
    topic,
    message: text,
    status: 'unread',
    messages: [{ from: 'member', text, at: now }],
    memberReadAt: now,
  });
  return Response.json({ conversation: toSupportJson(chat) }, { status: 201 });
});
