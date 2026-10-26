import { istParts, istToday } from '@/features/doctors/time';
import { formatDay, formatTime } from '@/features/reminders/schedule';

import { SUPPORT_TOPICS } from './topics';
import { type SupportMessage, type SupportSummary } from './types';

// Chats are shown in India time, as consults are, whatever the phone is set to.

/** "5:30 PM" */
export const messageTime = (at: string) => formatTime(istParts(at).time);

/** "Today", "Yesterday", "Sat, 10 Oct": the line between days in a chat. */
export const messageDay = (at: string, now = new Date()) =>
  formatDay(istParts(at).date, istToday(now));

/** For a list: the time today, otherwise the day. */
export function whenShort(at: string, now = new Date()) {
  const day = messageDay(at, now);
  return day === 'Today' ? messageTime(at) : day;
}

/** The latest line of a chat as one quiet row: "You: …" or "Priya: …". */
export function preview(message?: SupportMessage) {
  if (!message) return 'No messages yet';
  const who = message.from === 'member' ? 'You' : (message.agentName ?? 'Support');
  return `${who}: ${message.text.replace(/\s+/g, ' ')}`;
}

/** "Pod tests · #A1B2C3", for screen readers and the list. */
export const chatName = (chat: Pick<SupportSummary, 'topic' | 'reference'>) =>
  `${SUPPORT_TOPICS[chat.topic].label} · #${chat.reference}`;
