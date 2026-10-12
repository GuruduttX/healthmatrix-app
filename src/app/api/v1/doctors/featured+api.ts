import { requireMember } from '@/server/auth';
import { connectDB } from '@/server/db';
import { nextFreeSlots, toDoctorJson } from '@/server/doctors';
import { handle } from '@/server/http';
import { ConsultModel, DoctorModel } from '@/server/models';

/** A consult the doctor started but never ended stops counting as live after this. */
const LIVE_FOR_MS = 12 * 60 * 60 * 1000;
/** How many of the member's past consults are looked at to find their doctors. */
const HISTORY_LIMIT = 100;

/**
 * The doctor for the Care tab's top card: one who has consulted this member before and is in a
 * consult right now (with anyone), so the member can book a follow-up with someone who knows them
 * while they are online. Doctors who are inactive or paused bookings in the console are skipped.
 * `null` when no such doctor is online. Matches `FeaturedDoctor` in `features/doctors/types.ts`.
 */
export const GET = handle(async (request: Request) => {
  await connectDB();
  const member = await requireMember(request);

  const past = await ConsultModel.find({ member: member._id, status: 'completed' })
    .sort({ scheduledAt: -1 })
    .limit(HISTORY_LIMIT)
    .select('doctor specialty scheduledAt');

  // Most recent first, one entry per doctor.
  const seen = new Map<string, { lastAt: Date; specialty: string; count: number }>();
  for (const consult of past) {
    const key = String(consult.doctor);
    const entry = seen.get(key);
    if (entry) entry.count += 1;
    else seen.set(key, { lastAt: consult.scheduledAt, specialty: consult.specialty, count: 1 });
  }
  if (seen.size === 0) return Response.json({ featured: null });

  const ids = [...seen.keys()];
  const [doctors, liveIds] = await Promise.all([
    DoctorModel.find({
      _id: { $in: ids },
      isActive: true,
      'schedule.acceptingBookings': { $ne: false },
    }),
    ConsultModel.distinct('doctor', {
      doctor: { $in: ids },
      status: 'in_progress',
      startedAt: { $gte: new Date(Date.now() - LIVE_FOR_MS) },
    }),
  ]);
  const live = new Set(liveIds.map(String));
  const byId = new Map(doctors.map((doctor) => [String(doctor._id), doctor]));
  const available = ids.filter((id) => byId.has(id));
  // Most recently seen first, among those online now.
  const pick = available.find((id) => live.has(id));
  if (!pick) return Response.json({ featured: null });

  const doctor = byId.get(pick)!;
  const history = seen.get(pick)!;
  const next = await nextFreeSlots([doctor]);
  return Response.json({
    featured: {
      doctor: toDoctorJson(doctor, next.get(pick)),
      // Book the follow-up in the same specialty, if the doctor still offers it.
      specialty: doctor.specialties.includes(history.specialty) ? history.specialty : undefined,
      lastConsultAt: history.lastAt.toISOString(),
      consultCount: history.count,
    },
  });
});
