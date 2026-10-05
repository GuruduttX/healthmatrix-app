import { type InferSchemaType } from 'mongoose';

import { defineModel, mongoose } from '../mongoose';

/**
 * Full-record access (layer 2): a doctor asks, the member or their nominee
 * approves with an OTP, and the grant expires on its own.
 */
const accessGrantSchema = new mongoose.Schema(
  {
    member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },

    status: {
      type: String,
      enum: ['pending', 'active', 'expired', 'revoked'],
      default: 'pending',
    },
    otpHash: String,
    otpSentTo: String,
    approvedAt: Date,
    expiresAt: Date,
    revokedAt: Date,

    /** Every view is logged so the member can see who opened what, when. */
    views: [{ at: { type: Date, default: Date.now }, ip: String, what: String }],
  },
  { timestamps: true },
);

accessGrantSchema.index({ member: 1, createdAt: -1 });
accessGrantSchema.index({ doctor: 1, status: 1 });

export type AccessGrant = InferSchemaType<typeof accessGrantSchema>;
export const AccessGrantModel = defineModel('AccessGrant', accessGrantSchema);
