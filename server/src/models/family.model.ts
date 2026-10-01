import { Schema, model, type InferSchemaType } from 'mongoose';

/** A Family plan group. Caregivers manage records for children and parents. */
const familySchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'Member', required: true },
    members: [
      {
        _id: false,
        member: { type: Schema.Types.ObjectId, ref: 'Member', required: true },
        relation: String,
        /** The caregiver who manages this person's records and alerts. */
        managedBy: { type: Schema.Types.ObjectId, ref: 'Member' },
      },
    ],
  },
  { timestamps: true },
);

familySchema.index({ 'members.member': 1 });

export type Family = InferSchemaType<typeof familySchema>;
export const FamilyModel = model('Family', familySchema);
