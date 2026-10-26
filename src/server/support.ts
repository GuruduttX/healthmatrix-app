import { type Types } from 'mongoose';
import { z } from 'zod';

import { type Enquiry } from './models';

/** A chat this long is wrapped up: the member ends it and starts another. */
export const SUPPORT_MESSAGES_MAX = 400;
/** How many of the member's chats the app lists, newest first. */
export const SUPPORT_LISTED = 30;

/** What the member types, the same limit as the stored message. */
export const supportText = z
  .string('Write a message')
  .trim()
  .min(1, 'Write a message')
  .max(2000, 'Keep the message under 2,000 letters');

/** Matches the member's own support chats, never the site's other enquiries. */
export const ownChat = (id: string, member: Types.ObjectId) => ({
  _id: id,
  type: 'support' as const,
  member: member,
});

type SupportChat = Enquiry & { _id: Types.ObjectId; createdAt: Date; updatedAt: Date };
type StoredMessage = NonNullable<Enquiry['messages']>[number] & { _id?: Types.ObjectId };

const toMessageJson = (message: StoredMessage) => ({
  id: String(message._id),
  from: message.from,
  text: message.text,
  agentName: message.agentName ?? undefined,
  at: message.at.toISOString(),
});

/**
 * A chat on the member's list: where it stands and its latest line. Matches `SupportSummary` in
 * `features/support/types.ts`.
 */
export function toSupportSummaryJson(chat: SupportChat) {
  const messages = (chat.messages ?? []) as StoredMessage[];
  const last = messages.at(-1);
  const readUpTo = chat.memberReadAt?.getTime() ?? 0;
  return {
    id: String(chat._id),
    /** The last six of the id, for the member to quote: "A1B2C3". */
    reference: String(chat._id).slice(-6).toUpperCase(),
    topic: chat.topic ?? 'other',
    status: chat.status === 'resolved' ? ('ended' as const) : ('open' as const),
    endedBy: chat.endedBy ?? undefined,
    endedAt: chat.endedAt?.toISOString(),
    /** The member's messages up to here have been seen by the team. */
    seenAt: chat.supportReadAt?.toISOString(),
    lastMessage: last && toMessageJson(last),
    /** The team's replies the member hasn't opened yet. */
    unread: messages.filter((m) => m.from === 'support' && m.at.getTime() > readUpTo).length,
    createdAt: chat.createdAt.toISOString(),
    updatedAt: chat.updatedAt.toISOString(),
  };
}

/** A whole chat, every line in order. Matches `SupportConversation` in `features/support`. */
export function toSupportJson(chat: SupportChat) {
  return {
    ...toSupportSummaryJson(chat),
    messages: ((chat.messages ?? []) as StoredMessage[]).map(toMessageJson),
  };
}
