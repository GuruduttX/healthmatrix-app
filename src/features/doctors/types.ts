/** Mirrors `SPECIALTIES` in `src/server/constants.ts`. */
export type Specialty =
  | 'general_medicine'
  | 'diabetes_endocrinology'
  | 'cardiology'
  | 'paediatrics'
  | 'gynaecology'
  | 'dermatology'
  | 'psychiatry'
  | 'nutrition';

/** Matches `toDoctorJson` in `src/server/doctors.ts`. */
export type Doctor = {
  id: string;
  name: string; // "Dr Atul Mishra"
  qualifications?: string;
  /** `Specialty` keys, or specialties the doctor typed in the console ("Orthopaedics"). */
  specialties: string[];
  languages: string[];
  location?: string;
  registrationNumber: string;
  council?: string;
  photoUrl?: string;
  about?: string;
  experienceYears?: number;
  /** How long each consult runs, set by the doctor. */
  slotMinutes: number;
  /** How many days ahead the doctor can be booked. */
  bookingWindowDays: number;
  /** The first free slot in the booking window, ISO. */
  nextSlot?: string;
};

export type Slot = { at: string; time: string; available: boolean };

/**
 * One day of a doctor's slots, in India time. `off` says why a day has none: not a working day,
 * time off, or bookings paused. Matches `SlotDay` in `src/server/schedule.ts`.
 */
export type SlotDay = {
  date: string;
  off: 'weekly' | 'time_off' | 'paused' | null;
  slots: Slot[];
};

export type DoctorWithSlots = {
  doctor: Doctor;
  slotMinutes: number;
  timeZone: string;
  days: SlotDay[];
};

/** Matches `toConsultJson` in `src/server/consults.ts`. */
export type Appointment = {
  id: string;
  doctor: Pick<Doctor, 'id' | 'name' | 'qualifications' | 'photoUrl'> | null;
  specialty: Specialty;
  scheduledAt: string;
  durationMinutes: number;
  /** `missed`: booked but not started within 10 minutes of its time; listed with past consults. */
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'missed';
  reason?: string;
  /** When the doctor started the consult in the console. */
  startedAt?: string;
  /** When the doctor ended it. */
  endedAt?: string;
  cancelledBy?: 'member' | 'doctor';
  /** The doctor's message when they cancelled. */
  cancelReason?: string;
};

/** A completed or missed consult. Matches `?when=past` on `src/app/api/v1/consults+api.ts`. */
export type PastConsult = Appointment & {
  /** The prescription signed in this consult; opens at `/records/[id]`. */
  prescriptionId?: string;
};

/**
 * A request for a custom consult time, waiting for or answered by the doctor. Matches
 * `toConsultRequestJson` in `src/server/consult-requests.ts`.
 */
export type ConsultRequest = {
  id: string;
  doctor: Pick<Doctor, 'id' | 'name' | 'qualifications' | 'photoUrl'> | null;
  specialty: Specialty;
  requestedAt: string;
  durationMinutes: number;
  reason?: string;
  /** `expired`: still unanswered when the time came. Approved ones show as appointments. */
  status: 'pending' | 'declined' | 'expired';
  /** The doctor's note when declining. */
  declineReason?: string;
  createdAt?: string;
};
