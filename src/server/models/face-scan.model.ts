import { type InferSchemaType } from 'mongoose';

import { vitalCodes } from '@/features/face-scan/vitals';

import { defineModel, mongoose } from '../mongoose';

/**
 * A face scan the member did on their phone: vitals estimated from the camera (rPPG), not a
 * medical device. Kept apart from health records, which the doctor console shares, so these
 * estimates never mix with lab and pod results.
 */
const faceScanSchema = new mongoose.Schema(
  {
    member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
    measuredAt: { type: Date, required: true },
    /** Seconds of signal the vitals came from. */
    seconds: { type: Number, required: true },
    quality: { type: String, enum: ['good', 'fair'], required: true },
    /** What measured it: "rppg-pos" for the phone's own, or a licensed SDK's name. */
    engine: { type: String, required: true },
    vitals: [
      {
        _id: false,
        code: { type: String, enum: vitalCodes, required: true },
        value: { type: Number, required: true },
      },
    ],
    platform: { type: String, enum: ['ios', 'android', 'web'] },
  },
  { timestamps: true },
);

faceScanSchema.index({ member: 1, measuredAt: -1 });

export type FaceScanDoc = InferSchemaType<typeof faceScanSchema>;
export const FaceScanModel = defineModel('FaceScan', faceScanSchema);
