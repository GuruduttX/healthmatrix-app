import { type InferSchemaType } from 'mongoose';

import { defineModel, mongoose } from '../mongoose';

/** A signed-in device. Only a hash of the token is stored; MongoDB deletes it once it expires. */
const sessionSchema = new mongoose.Schema(
  {
    member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true, expires: 0 },
  },
  { timestamps: true },
);

export type Session = InferSchemaType<typeof sessionSchema>;
export const SessionModel = defineModel('Session', sessionSchema);
