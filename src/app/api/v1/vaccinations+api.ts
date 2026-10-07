import { requireMember } from '@/server/auth';
import { connectDB } from '@/server/db';
import { handle } from '@/server/http';
import { loadVaccinations } from '@/server/records';
import { toVaccinationJson } from '@/server/vaccinations';

/**
 * The member's vaccines with every dose and where it stands. Used by the Care tab and to
 * schedule dose notifications on the phone. Soonest unfinished first, completed ones last.
 */
export const GET = handle(async (request: Request) => {
  await connectDB();
  const member = await requireMember(request);
  const vaccinations = (await loadVaccinations(member._id)).map(({ vaccination, doctor }) =>
    toVaccinationJson(vaccination, doctor),
  );
  const nextDue = (v: (typeof vaccinations)[number]) =>
    v.doses.find((dose) => dose.status !== 'given')?.dueOn ?? '9999';
  vaccinations.sort((a, b) => nextDue(a).localeCompare(nextDue(b)) || a.name.localeCompare(b.name));
  return Response.json({ vaccinations });
});
