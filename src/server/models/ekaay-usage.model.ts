import { defineModel, mongoose } from '../mongoose';

/**
 * Ekaay's usage counters for the app, one document per key, e.g. `ask:day:<member>:2026-10-26`.
 * Each expires on its own (`exp`). The website's Ekaay keeps its own in `ekaay_limits`.
 */
const ekaayUsageSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    n: { type: Number, default: 0 },
    /** The member's latest answers, as hashes, on `said:<member>`: only these are read aloud. */
    said: { type: [String], default: undefined },
    exp: { type: Date, required: true },
  },
  { collection: 'ekaay_usage', versionKey: false },
);

ekaayUsageSchema.index({ exp: 1 }, { expireAfterSeconds: 0 });

export const EkaayUsageModel = defineModel('EkaayUsage', ekaayUsageSchema);
