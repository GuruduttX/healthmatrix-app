import { type InferSchemaType } from 'mongoose';

import { defineModel, mongoose } from '../mongoose';

/** A Family plan group. Caregivers manage records for children and parents. */
const familySchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
    members: [
      {
        _id: false,
        member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
        relation: String,
        /** The caregiver who manages this person's records and alerts. */
        managedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' },
      },
    ],
  },
  { timestamps: true },
);

familySchema.index({ 'members.member': 1 });

export type Family = InferSchemaType<typeof familySchema>;
export const FamilyModel = defineModel('Family', familySchema);
