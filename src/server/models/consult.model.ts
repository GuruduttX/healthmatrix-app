import { type InferSchemaType } from 'mongoose';

import { CANCELLED_BY, CONSULT_MODES, CONSULT_STATUSES, SPECIALTIES } from '../constants';
import { defineModel, mongoose } from '../mongoose';

/**
 * A video consult. The record is shared via an AccessGrant before it starts. Shared with the
 * doctor console, which starts, ends and cancels consults; its fields are mirrored here.
 */
const consultSchema = new mongoose.Schema(
  {
    member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    specialty: { type: String, enum: SPECIALTIES, default: 'general_medicine' },
    scheduledAt: { type: Date, required: true },
    /** The slot length when it was booked. Missing on older consults: 30. */
    durationMinutes: Number,
    status: {
      type: String,
      enum: CONSULT_STATUSES,
      default: 'scheduled',
    },
    /** What the member wants to discuss, written when booking. */
    reason: String,
    mode: { type: String, enum: CONSULT_MODES, default: 'video' },
    /** Set when the consult is taken from inside a pod. */
    pod: { type: mongoose.Schema.Types.ObjectId, ref: 'Pod' },
    cancelledAt: Date,
    cancelledBy: { type: String, enum: CANCELLED_BY },
    /** Shown to the member when the doctor cancels. */
    cancelReason: String,
    /** Set by the console when the doctor starts and ends the consult. */
    startedAt: Date,
    endedAt: Date,

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
