import { type Types } from 'mongoose';

import { type PopulatedDoctor } from './consults';
import { toDoctorJson } from './doctors';
import { type ConsultRequest } from './models';

/** How far ahead of the time asked for a request must come, so the doctor can answer. */
export const REQUEST_NOTICE_MS = 30 * 60 * 1000;
/** How many unanswered requests a member can have at once. */
export const MAX_PENDING_REQUESTS = 3;
/** A declined or unanswered request stays on the member's list this long, so they see why. */
export const REQUEST_SHOWN_MS = 2 * 24 * 60 * 60 * 1000;

type PopulatedRequest = Omit<ConsultRequest, 'doctor'> &
  PopulatedDoctor & { _id: Types.ObjectId; createdAt?: Date };

/**
 * A request as the app sees it. A pending one whose time has passed reads as `expired`; approved
 * ones aren't listed, since their consult is. Matches `ConsultRequest` in `features/doctors`.
 */
export function toConsultRequestJson(request: PopulatedRequest, now = Date.now()) {
  const doctor = request.doctor ? toDoctorJson(request.doctor) : null;
  const expired = request.status === 'pending' && request.requestedAt.getTime() <= now;
  return {
    id: String(request._id),
    doctor: doctor && {
      id: doctor.id,
      name: doctor.name,
      qualifications: doctor.qualifications,
      photoUrl: doctor.photoUrl,
    },
    specialty: request.specialty,
    requestedAt: request.requestedAt.toISOString(),
    durationMinutes: request.durationMinutes,
    reason: request.reason ?? undefined,
    status: expired ? ('expired' as const) : request.status,
    declineReason: request.status === 'declined' ? (request.declineReason ?? undefined) : undefined,
    createdAt: request.createdAt?.toISOString(),
  };
}
