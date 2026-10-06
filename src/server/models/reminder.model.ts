import { type InferSchemaType } from 'mongoose';

import { DOSE_STATUSES, MEAL_TIMINGS, REMINDER_FREQUENCIES, REMINDER_KINDS } from '../constants';
import { defineModel, mongoose } from '../mongoose';

/** One dose the member marked. Keyed by the local day and time it was due. */
const doseLogSchema = new mongoose.Schema(
  {
    date: { type: String, required: true }, // "2026-10-06"
    time: { type: String, required: true }, // "20:00"
    status: { type: String, enum: DOSE_STATUSES, required: true },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

/**
 * Medicine, test and vaccine reminders, for the member and their caregivers.
 *
 * Days and times are the member's local calendar ("2026-10-06", "08:00"), never UTC instants:
 * a medicine taken at 8 am stays at 8 am wherever the phone is. The app works out each dose
 * from the repeat rule and schedules the notifications on the device.
 */
const reminderSchema = new mongoose.Schema(
  {
    member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
    kind: { type: String, enum: REMINDER_KINDS, required: true },
    title: { type: String, required: true, trim: true }, // "Metformin"
    dose: { type: String, trim: true }, // "500 mg", "1 tablet"
    mealTiming: { type: String, enum: MEAL_TIMINGS },
    note: { type: String, trim: true },

    /** Times of day as "HH:mm", sorted. */
    times: { type: [String], default: undefined },
    frequency: { type: String, enum: REMINDER_FREQUENCIES, default: 'daily' },
    /** For "weekdays": 0 is Sunday. */
    weekdays: { type: [Number], default: undefined },
    /** For "interval": every this many days from `startsOn`. */
    everyDays: Number,
    /** First and (optional) last day, as "YYYY-MM-DD". */
    startsOn: String,
    endsOn: String,

    /** One-off items such as a test; medicines use the fields above. */
    dueAt: Date,

    /** Created from an e-prescription when set. */
    prescription: { type: mongoose.Schema.Types.ObjectId, ref: 'HealthRecord' },
    log: { type: [doseLogSchema], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

reminderSchema.index({ member: 1, isActive: 1 });

export type Reminder = InferSchemaType<typeof reminderSchema>;
export const ReminderModel = defineModel('Reminder', reminderSchema);
