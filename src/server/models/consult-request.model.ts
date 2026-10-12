import { type InferSchemaType } from 'mongoose';

import { CONSULT_REQUEST_STATUSES, SPECIALTIES } from '../constants';
import { defineModel, mongoose } from '../mongoose';

/**
 * A member asking a doctor for a time off the open slots, e.g. 3:25 PM. Holds no time until the
 * doctor approves it in the console, which creates the consult (`consult`) the same way a booking
 * does. Shared with the doctor console; its fields are mirrored there.
 */
const consultRequestSchema = new mongoose.Schema(
  {
    member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    specialty: { type: String, enum: SPECIALTIES, default: 'general_medicine' },
    /** The start the member asked for, any whole minute. */
    requestedAt: { type: Date, required: true },
    /** The doctor's consult length when it was asked. */
    durationMinutes: { type: Number, required: true },
    /** What the member wants to discuss. */
    reason: String,
    status: { type: String, enum: CONSULT_REQUEST_STATUSES, default: 'pending' },
    /** When the doctor approved or declined, or the member withdrew. */
    respondedAt: Date,
    /** The doctor's note when declining, shown to the member. */
    declineReason: String,
    /** The consult the approval created. */
    consult: { type: mongoose.Schema.Types.ObjectId, ref: 'Consult' },
  },
  { timestamps: true },
);

consultRequestSchema.index({ member: 1, status: 1, requestedAt: -1 });
/** The console's "Booking requests" list. */
consultRequestSchema.index({ doctor: 1, status: 1, requestedAt: 1 });

export type ConsultRequest = InferSchemaType<typeof consultRequestSchema>;
export const ConsultRequestModel = defineModel('ConsultRequest', consultRequestSchema);
