import { type InferSchemaType } from 'mongoose';

import { FAMILY_RELATIONS } from '../constants';
import { defineModel, mongoose } from '../mongoose';

/**
 * One person in a member's family: `owner` can see `member`'s records, prescriptions, vaccines
 * and medicines, read-only. Made only after `member` confirmed with an OTP sent to their phone,
 * and either of them can remove it. One way: `member` doesn't see `owner`'s records.
 */
const familyLinkSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
    member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
    /** `member` as `owner` describes them: "parent" means the owner's parent. */
    relation: { type: String, enum: FAMILY_RELATIONS, default: 'other' },
    /** In their own words when `relation` is "other", e.g. "Cousin" or "Friend". */
    relationName: { type: String, trim: true, maxlength: 30 },
  },
  { timestamps: true },
);

familyLinkSchema.index({ owner: 1, member: 1 }, { unique: true });
/** "Who can see my records", for the member's own Card tab. */
familyLinkSchema.index({ member: 1 });

export type FamilyLink = InferSchemaType<typeof familyLinkSchema>;
export const FamilyLinkModel = defineModel('FamilyLink', familyLinkSchema);
