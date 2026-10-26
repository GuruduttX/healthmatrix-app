import { type InferSchemaType } from 'mongoose';

import { ENQUIRY_STATUSES, SUPPORT_TOPICS } from '../constants';
import { defineModel, mongoose } from '../mongoose';

/** One line of a support chat, from the member or from the support team. */
const supportMessageSchema = new mongoose.Schema({
  from: { type: String, enum: ['member', 'support'], required: true },
  text: { type: String, required: true, trim: true, maxlength: 2000 },
  /** The team member who replied, as the admin signs it ("Priya"). */
  agentName: String,
  at: { type: Date, required: true, default: () => new Date() },
});

/**
 * The Cloudspital website's `enquiries` collection, shared with the site and its admin. The site's
 * forms write `contact` and `demo` enquiries; the app writes `support` ones, each a live chat
 * between a member and the support team. The statuses are the site's, read for a chat as:
 * `unread` the member wrote last and the team hasn't opened it, `read` the team has, `contacted`
 * the team replied last, `resolved` the chat ended. Only `support` enquiries are read here.
 */
const enquirySchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['contact', 'demo', 'support'], required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, default: '' },
    phone: String,
    organization: String,
    /** The member's first message, so the site's enquiry list shows what a chat is about. */
    message: String,
    status: { type: String, enum: ENQUIRY_STATUSES, default: 'unread' },

    // Support chats only.
    /** Where it came from: `app` for the HealthMatrix app. */
    source: String,
    member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' },
    /** The member's twelve-digit HealthMatrix ID, for the team to look them up. */
    memberId: String,
    topic: { type: String, enum: SUPPORT_TOPICS },
    messages: { type: [supportMessageSchema], default: undefined },
    /** When the member last had the chat open: the team's replies after it are new to them. */
    memberReadAt: Date,
    /** When the team last opened it: the member's messages up to it show as seen. */
    supportReadAt: Date,
    endedAt: Date,
    endedBy: { type: String, enum: ['member', 'support'] },
  },
  { timestamps: true, collection: 'enquiries' },
);

/** The member's chats, newest first. */
enquirySchema.index({ type: 1, member: 1, updatedAt: -1 });
/** The admin's inbox: open chats waiting on the team first. */
enquirySchema.index({ type: 1, status: 1, updatedAt: -1 });

export type Enquiry = InferSchemaType<typeof enquirySchema>;
export const EnquiryModel = defineModel('Enquiry', enquirySchema);
