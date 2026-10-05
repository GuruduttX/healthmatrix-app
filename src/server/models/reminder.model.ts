import { type InferSchemaType } from 'mongoose';

import { REMINDER_KINDS } from '../constants';
import { defineModel, mongoose } from '../mongoose';

/** Medicine, test and vaccine reminders, for the member and their caregivers. */
const reminderSchema = new mongoose.Schema(
  {
    member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
    kind: { type: String, enum: REMINDER_KINDS, required: true },
    title: { type: String, required: true }, // "BP tablet"
    dose: String,

    /** Daily times as "HH:mm" for medicines; one-off items use `dueAt`. */
    times: [String],
    dueAt: Date,
    startsOn: Date,
    endsOn: Date,

    /** Created from an e-prescription when set. */
    prescription: { type: mongoose.Schema.Types.ObjectId, ref: 'HealthRecord' },
    log: [{ _id: false, dueAt: Date, takenAt: Date }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

reminderSchema.index({ member: 1, isActive: 1 });

export type Reminder = InferSchemaType<typeof reminderSchema>;
export const ReminderModel = defineModel('Reminder', reminderSchema);
