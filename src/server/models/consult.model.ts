import { type InferSchemaType } from 'mongoose';

import { SPECIALTIES } from '../constants';
import { defineModel, mongoose } from '../mongoose';

/** A video consult. The record is shared via an AccessGrant before it starts. */
const consultSchema = new mongoose.Schema(
  {
    member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    specialty: { type: String, enum: SPECIALTIES, default: 'general_medicine' },
    scheduledAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
      default: 'scheduled',
    },

    accessGrant: { type: mongoose.Schema.Types.ObjectId, ref: 'AccessGrant' },
    /** Ekaay's one-page summary, ready before the consult starts. */
    ekaaySummary: String,
    prescription: { type: mongoose.Schema.Types.ObjectId, ref: 'HealthRecord' },
  },
  { timestamps: true },
);

consultSchema.index({ member: 1, scheduledAt: -1 });
consultSchema.index({ doctor: 1, scheduledAt: 1 });

export type Consult = InferSchemaType<typeof consultSchema>;
export const ConsultModel = defineModel('Consult', consultSchema);
