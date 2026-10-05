import { type InferSchemaType } from 'mongoose';

import { defineModel, mongoose } from '../mongoose';

/** A one-time sign-in code sent to a phone. MongoDB deletes it once it expires. */
const otpChallengeSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, index: true },
    /** The name typed on the login screen, used if this phone has no account yet. */
    name: { type: String, required: true, trim: true },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true, expires: 0 },
  },
  { timestamps: true },
);

export type OtpChallenge = InferSchemaType<typeof otpChallengeSchema>;
export const OtpChallengeModel = defineModel('OtpChallenge', otpChallengeSchema);
