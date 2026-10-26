import { type Types } from 'mongoose';

import { toDoctorJson } from './doctors';
import { type Consult, type Doctor } from './models';
import { DEFAULT_CONSULT_MINUTES, isMissed } from './schedule';

/** What `populate('doctor', DOCTOR_FIELDS)` fills in; null if the doctor was deleted. */
export type PopulatedDoctor = { doctor: (Doctor & { _id: Types.ObjectId }) | null };

/** The doctor fields a consult needs. Never the phone. */
export const DOCTOR_FIELDS =
  'name qualifications specialties languages city state registrationNumber council photoUrl';

type PopulatedConsult = Omit<Consult, 'doctor'> & PopulatedDoctor & { _id: Types.ObjectId };

/** A consult as the app sees it. Matches `Appointment` in `features/doctors`. */
export function toConsultJson(consult: PopulatedConsult) {
  const doctor = consult.doctor ? toDoctorJson(consult.doctor) : null;
  return {
    id: String(consult._id),
    doctor: doctor && {
      id: doctor.id,
      name: doctor.name,
      qualifications: doctor.qualifications,
      photoUrl: doctor.photoUrl,
    },
    specialty: consult.specialty,
    scheduledAt: consult.scheduledAt.toISOString(),
    durationMinutes: consult.durationMinutes ?? DEFAULT_CONSULT_MINUTES,
    // Booked but not started within `LATE_START_MINUTES` of its time: shown as missed.
    status: isMissed(consult) ? ('missed' as const) : consult.status,
    reason: consult.reason ?? undefined,
    startedAt: consult.startedAt?.toISOString(),
    endedAt: consult.endedAt?.toISOString(),
    cancelledBy: consult.cancelledBy ?? undefined,
    cancelReason: consult.cancelledBy === 'doctor' ? (consult.cancelReason ?? undefined) : undefined,
  };
}
