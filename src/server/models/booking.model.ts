import { type InferSchemaType } from 'mongoose';

import { defineModel, mongoose } from '../mongoose';

/**
 * Tests booked at a pod. Walk-in: Mobilab puts the booking in the pod's queue with no time, and
 * the member is tested whenever they arrive.
 */
const bookingSchema = new mongoose.Schema(
  {
    member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
    /** The pod as it was when booked: its Mobilab clinic id and name. */
    pod: {
      id: { type: String, required: true },
      name: { type: String, required: true },
    },
    /** Health checks booked, by name, for showing the booking. */
    profiles: { type: [String], default: [] },
    /** Every test code the booking covers, the checks' tests included. */
    tests: { type: [String], required: true },
    /** The sex sent to the lab for its reference ranges: Mobilab takes male or female only. */
    sex: { type: String, enum: ['male', 'female'], required: true },
    status: {
      type: String,
      enum: ['booked', 'completed', 'cancelled'],
      default: 'booked',
    },

    /** Mobilab's side. `bookingId` is our reference, sent on creation and used by its webhook. */
    mobilab: {
      bookingId: { type: String, required: true, unique: true },
      id: String,
      /** Mobilab's lifecycle: pending, in_progress, … report_generated (see `server/pod-bookings.ts`). */
      status: String,
      /** When the status was last asked for, so screens don't ask on every load. */
      checkedAt: Date,
      /** When Mobilab's "report ready" webhook last arrived for it, signed. */
      webhookAt: Date,
      /** What filed the results: the webhook, or the app's check when a screen loaded. */
      filedVia: { type: String, enum: ['webhook', 'app'] },
    },

    /** Set when a doctor ordered the tests, so results flow back to them. */
    orderedByConsult: { type: mongoose.Schema.Types.ObjectId, ref: 'Consult' },
    /** The prescription the tests were booked from, when they were. */
    prescription: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription' },
    result: { type: mongoose.Schema.Types.ObjectId, ref: 'HealthRecord' },
  },
  { timestamps: true },
);

bookingSchema.index({ member: 1, createdAt: -1 });
bookingSchema.index({ prescription: 1 }, { sparse: true });

export type Booking = InferSchemaType<typeof bookingSchema>;
export const BookingModel = defineModel('Booking', bookingSchema);
