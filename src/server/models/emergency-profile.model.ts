import { Schema, model, type InferSchemaType } from 'mongoose';

import { EMERGENCY_FIELDS } from '../constants/index.js';

const contactSchema = new Schema(
  {
    name: { type: String, required: true },
    relation: String,
    phone: { type: String, required: true },
    /** Receives the OTP when the member cannot respond. */
    isNominee: { type: Boolean, default: false },
  },
  { _id: false },
);

/** What a stranger sees after scanning the QR (layer 1). One per member. */
const emergencyProfileSchema = new Schema(
  {
    member: { type: Schema.Types.ObjectId, ref: 'Member', required: true, unique: true },

    allergies: [String],
    conditions: [String],
    medicines: [String],
    emergencyContacts: [contactSchema],
    organDonor: Boolean,
    insurance: { provider: String, policyNumber: String },

    /** The one optional line printed on the card for offline use. */
    medicalAlert: { type: String, maxlength: 60 },

    /** Member chooses field by field what the public view shows. */
    visibleFields: { type: [String], enum: EMERGENCY_FIELDS, default: () => [...EMERGENCY_FIELDS] },
  },
  { timestamps: true },
);

export type EmergencyProfile = InferSchemaType<typeof emergencyProfileSchema>;
export const EmergencyProfileModel = model('EmergencyProfile', emergencyProfileSchema);
