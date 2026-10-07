import { type InferSchemaType } from 'mongoose';

import { defineModel, mongoose } from '../mongoose';

const doseSchema = new mongoose.Schema(
  {
    number: { type: Number, required: true },
    /** Midnight India time on the due day. */
    dueOn: { type: Date, required: true },
    /** The doctor app's reminder for this dose. */
    reminder: { type: mongoose.Schema.Types.ObjectId, ref: 'Reminder' },
    /** Set when the member marks the dose given; midnight India time on that day. */
    givenAt: Date,
  },
  { _id: false },
);

/**
 * A vaccine a doctor prescribed, with its doses. Written by the doctor app; this app reads it
 * and only ever writes `doses.$.givenAt` (with targeted updates, never a whole-document save).
 */
const vaccinationSchema = new mongoose.Schema(
  {
    member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
    prescription: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription' },
    name: { type: String, required: true }, // "BCG"
    dose: { amount: Number, unit: String }, // 0.5 mL
    route: String, // "subcutaneous"
    site: String, // "left_upper_arm"
    instructions: String,
    schedule: {
      type: { type: String }, // "recurring"
      every: { count: Number, unit: String }, // 1 week
      totalDoses: Number,
    },
    doses: [doseSchema],
    status: String, // "scheduled"
  },
  { timestamps: true },
);

export type Vaccination = InferSchemaType<typeof vaccinationSchema>;
export const VaccinationModel = defineModel('Vaccination', vaccinationSchema);
