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
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  reason?: string;
  /** When the doctor started the consult in the console. */
  startedAt?: string;
  cancelledBy?: 'member' | 'doctor';
  /** The doctor's message when they cancelled. */
  cancelReason?: string;
};
