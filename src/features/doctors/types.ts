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
  specialties: Specialty[];
  languages: string[];
  location?: string;
  registrationNumber: string;
  council?: string;
  photoUrl?: string;
  /** The first free slot this week, ISO. */
  nextSlot?: string;
};

export type Slot = { at: string; time: string; available: boolean };

/** One day of a doctor's slots, in India time. */
export type SlotDay = { date: string; slots: Slot[] };

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
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  reason?: string;
};
