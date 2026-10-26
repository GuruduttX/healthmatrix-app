/** What a support chat is about. Matches `SUPPORT_TOPICS` in `server/constants.ts`. */
export type SupportTopic =
  | 'consults'
  | 'pods'
  | 'records'
  | 'medicines'
  | 'account'
  | 'billing'
  | 'app'
  | 'other';

export type SupportMessage = {
  id: string;
  from: 'member' | 'support';
  text: string;
  /** The team member who replied ("Priya"). */
  agentName?: string;
  at: string;
};

/** A chat on the member's list. Matches `toSupportSummaryJson` in `server/support.ts`. */
export type SupportSummary = {
  id: string;
  /** "A1B2C3", for the member to quote. */
  reference: string;
  topic: SupportTopic;
  status: 'open' | 'ended';
  endedBy?: 'member' | 'support';
  endedAt?: string;
  /** The member's messages up to here have been seen by the team. */
  seenAt?: string;
  lastMessage?: SupportMessage;
  /** The team's replies the member hasn't opened yet. */
  unread: number;
  createdAt: string;
  updatedAt: string;
};

/** A whole chat. Matches `toSupportJson` in `server/support.ts`. */
export type SupportConversation = SupportSummary & { messages: SupportMessage[] };
