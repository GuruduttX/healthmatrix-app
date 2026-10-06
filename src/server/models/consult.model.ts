import { type InferSchemaType } from 'mongoose';

import { CONSULT_STATUSES, SPECIALTIES } from '../constants';
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
      enum: CONSULT_STATUSES,
      default: 'scheduled',
    },
    /** What the member wants to discuss, written when booking. */
    reason: String,
    cancelledAt: Date,

    accessGrant: { type: mongoose.Schema.Types.ObjectId, ref: 'AccessGrant' },
    /** Ekaay's one-page summary, ready before the consult starts. */
    ekaaySummary: String,
    prescription: { type: mongoose.Schema.Types.ObjectId, ref: 'HealthRecord' },
  },
  { timestamps: true },
);

consultSchema.index({ member: 1, scheduledAt: -1 });
consultSchema.index({ doctor: 1, scheduledAt: 1 });
/** A doctor's slot can be held by one scheduled consult at a time. */
consultSchema.index(
  { doctor: 1, scheduledAt: 1 },
  { unique: true, partialFilterExpression: { status: 'scheduled' }, name: 'one_booking_per_slot' },
);

export type Consult = InferSchemaType<typeof consultSchema>;
export const ConsultModel = defineModel('Consult', consultSchema);
