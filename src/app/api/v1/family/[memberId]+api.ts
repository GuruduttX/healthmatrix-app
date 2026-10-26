import { requireMember } from '@/server/auth';
import { DOCTOR_FIELDS, toConsultJson, type PopulatedDoctor } from '@/server/consults';
import { connectDB } from '@/server/db';
import { requireFamilyMember, toFamilyMemberJson } from '@/server/family';
import { handle } from '@/server/http';
import { ConsultModel, EmergencyProfileModel, ReminderModel } from '@/server/models';
import { listRecords, loadVaccinations } from '@/server/records';
import { toReminderJson } from '@/server/reminders';
import { LATE_START_MINUTES } from '@/server/schedule';
import { toVaccinationJson } from '@/server/vaccinations';

/** Past consults shown on a family member's page. */
const PAST_LIMIT = 20;
/** A booked consult stays under "upcoming" until it's missed; then it's listed as past. */
const LATE_START_MS = LATE_START_MINUTES * 60 * 1000;

const clean = (list?: (string | null | undefined)[] | null) =>
  (list ?? []).map((item) => item?.trim()).filter((item): item is string => !!item);

/**
 * Everything about one family member, read-only: who they are, allergies and conditions, their
 * records timeline (prescriptions and reports), vaccines, medicines and consults. Only for
 * someone who added them with their OTP. Matches `FamilyOverview` in `features/family/types.ts`.
 */
export const GET = handle(async (request: Request, { memberId }: Record<string, string>) => {
  await connectDB();
  const me = await requireMember(request);
  const { link, member } = await requireFamilyMember(me._id, memberId);
  const now = Date.now();

  const [records, vaccinations, reminders, emergency, upcoming, past] = await Promise.all([
    listRecords(member._id),
    loadVaccinations(member._id),
    ReminderModel.find({ member: member._id, kind: 'medicine' }).sort({ createdAt: 1 }),
    EmergencyProfileModel.findOne({ member: member._id }).lean(),
    ConsultModel.find({
      member: member._id,
      $or: [
        { status: 'scheduled', scheduledAt: { $gt: new Date(now - LATE_START_MS) } },
        { status: 'in_progress' },
      ],
    })
      .sort({ scheduledAt: 1 })
      .populate<PopulatedDoctor>('doctor', DOCTOR_FIELDS),
    ConsultModel.find({
      member: member._id,
      $or: [
        { status: 'completed' },
        { status: 'scheduled', scheduledAt: { $lte: new Date(now - LATE_START_MS) } },
      ],
    })
      .sort({ scheduledAt: -1 })
      .limit(PAST_LIMIT)
      .populate<PopulatedDoctor>('doctor', DOCTOR_FIELDS),
  ]);

  const vaccines = vaccinations.map(({ vaccination, doctor }) =>
    toVaccinationJson(vaccination, doctor),
  );
  const nextDue = (v: (typeof vaccines)[number]) =>
    v.doses.find((dose) => dose.status !== 'given')?.dueOn ?? '9999';
  vaccines.sort((a, b) => nextDue(a).localeCompare(nextDue(b)) || a.name.localeCompare(b.name));

  return Response.json({
    member: toFamilyMemberJson(member, link),
    health: {
      allergies: clean(emergency?.allergies),
      conditions: clean(emergency?.conditions),
      medicines: clean(emergency?.medicines),
    },
    records,
    vaccinations: vaccines,
    medicines: reminders.map(toReminderJson),
    consults: { upcoming: upcoming.map(toConsultJson), past: past.map(toConsultJson) },
  });
});
