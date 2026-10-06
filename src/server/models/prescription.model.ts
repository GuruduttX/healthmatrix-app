import { type InferSchemaType } from 'mongoose';

import { defineModel, mongoose } from '../mongoose';

/**
 * A prescription a doctor wrote in a consult. Written by the doctor app; this app only reads it.
 * Each one has a matching `HealthRecord` that puts it on the member's timeline.
 */
const prescriptionSchema = new mongoose.Schema(
  {
    member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true, index: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    consult: { type: mongoose.Schema.Types.ObjectId, ref: 'Consult' },
    healthRecord: { type: mongoose.Schema.Types.ObjectId, ref: 'HealthRecord' },
    status: String, // "signed"
    source: String, // "typed"
    /** One line per medicine or instruction, as the doctor wrote it. */
    items: [String],
    signedAt: Date,
  },
  { timestamps: true },
);

export type Prescription = InferSchemaType<typeof prescriptionSchema>;
export const PrescriptionModel = defineModel('Prescription', prescriptionSchema);
