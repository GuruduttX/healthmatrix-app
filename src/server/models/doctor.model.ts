import { type InferSchemaType } from 'mongoose';

import { defineModel, mongoose } from '../mongoose';

/** One working session on a weekday, India time: { weekday: 1, from: "09:00", to: "13:00" }. */
const sessionSchema = new mongoose.Schema(
  {
    weekday: { type: Number, min: 0, max: 6, required: true },
    from: { type: String, required: true },
    to: { type: String, required: true },
  },
  { _id: false },
);

/** A stretch the doctor can't be booked: whole days or part of one. */
const timeOffSchema = new mongoose.Schema({
  start: { type: Date, required: true },
  end: { type: Date, required: true },
  note: String,
});

/**
 * A doctor on the network. Owned by the doctor console, which edits the profile and the
 * schedule; this app reads them to list doctors and book consults.
 */
const doctorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    qualifications: String, // "MBBS, MD (Medicine)"
    registrationNumber: { type: String, required: true },
    /** The medical council that issued the registration. */
    council: String,
    /** `SPECIALTIES` keys, or a specialty the doctor typed in the console ("Orthopaedics"). */
    specialties: { type: [String], default: ['general_medicine'] },
    languages: [String],
    city: String,
    state: String,
    photoUrl: String,
    telemedicineConsentAt: Date,
    /** A few lines patients read about the doctor. */
    about: String,
    /** Years in practice since registration. */
    experienceYears: { type: Number, min: 0, max: 70 },
    isActive: { type: Boolean, default: true },

    /**
     * When members can book, set in the console. Read with `resolveSchedule` in `../schedule`,
     * which fills in the defaults for doctors who never saved one.
     */
    schedule: {
      acceptingBookings: Boolean,
      slotMinutes: Number,
      bookingWindowDays: Number,
      minNoticeMinutes: Number,
      weekly: { type: [sessionSchema], default: undefined },
      timeOff: { type: [timeOffSchema], default: undefined },
      updatedAt: Date,
    },
    /**
     * Bumped by every booking, only so two bookings for this doctor at once take turns: each
     * writes it inside its transaction, so they conflict and Mongo retries the later one. The
     * console bumps it the same way when the doctor approves a custom-time request. Means
     * nothing else.
     */
    bookingVersion: Number,
  },
  { timestamps: true },
);

export type Doctor = InferSchemaType<typeof doctorSchema>;
export const DoctorModel = defineModel('Doctor', doctorSchema);
