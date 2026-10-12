import { type InferSchemaType } from 'mongoose';

import { FAMILY_RELATIONS } from '../constants';
import { defineModel, mongoose } from '../mongoose';

/**
 * A family member being added: the OTP sent to their phone, waiting for `owner` to enter it.
 * Kept apart from sign-in codes so the two never replace each other. MongoDB deletes it once it
 * expires.
 */
const familyInviteSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
    phone: { type: String, required: true },
    /** Used for their account if this number has none yet. */
    name: { type: String, trim: true, required: true },
    relation: { type: String, enum: FAMILY_RELATIONS, default: 'other' },
    /** Set only for codes we made ourselves; Twilio Verify keeps its own codes. */
    codeHash: String,
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true, expires: 0 },
  },
  { timestamps: true },
);

familyInviteSchema.index({ owner: 1, phone: 1 });

export type FamilyInvite = InferSchemaType<typeof familyInviteSchema>;
export const FamilyInviteModel = defineModel('FamilyInvite', familyInviteSchema);
