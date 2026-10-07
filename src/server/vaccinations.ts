import { type Types } from 'mongoose';

import { displayName } from './doctors';
import { type Doctor, type Vaccination } from './models';

type Id = Types.ObjectId;
type DoctorDoc = Doctor & { _id: Id };
export type VaccinationDoc = Vaccination & { _id: Id; createdAt?: Date };

const IST_OFFSET_MS = 330 * 60 * 1000;

/** The India-time day of an instant: "2026-10-06". */
export const istDate = (at: Date) =>
  new Date(at.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);

/** Midnight India time on a day, the way the doctor app stores due dates. */
export function istMidnight(date: string) {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d) - IST_OFFSET_MS);
}

const ROUTES: Record<string, string> = {
  subcutaneous: 'Under the skin (subcutaneous)',
  intramuscular: 'Into the muscle (intramuscular)',
  intradermal: 'Into the skin (intradermal)',
  oral: 'By mouth (oral)',
  intranasal: 'Nasal spray (intranasal)',
};

/** "left_upper_arm" -> "Left upper arm" */
const humanize = (text: string) => {
  const words = text.replace(/[_-]+/g, ' ').trim().toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/** "3 doses, 1 week apart", "Single dose" */
function scheduleText(vaccination: VaccinationDoc) {
  const total = vaccination.schedule?.totalDoses ?? vaccination.doses.length;
  if (total <= 1) return 'Single dose';
  const every = vaccination.schedule?.every;
  if (every?.count && every.unit) {
    const unit = every.unit.replace(/s$/, '');
    return `${total} doses, ${every.count} ${unit}${every.count === 1 ? '' : 's'} apart`;
  }
  return `${total} doses`;
}

export type DoseStatus = 'given' | 'overdue' | 'due' | 'upcoming';

/** Where every dose stands today, India time. */
export function doseStatuses(vaccination: VaccinationDoc, today = istDate(new Date())) {
  return [...vaccination.doses]
    .sort((a, b) => a.number - b.number)
    .map((dose) => {
      const dueOn = istDate(dose.dueOn);
      const status: DoseStatus = dose.givenAt
        ? 'given'
        : dueOn < today
          ? 'overdue'
          : dueOn === today
            ? 'due'
            : 'upcoming';
      return {
        number: dose.number,
        dueOn,
        givenOn: dose.givenAt ? istDate(dose.givenAt) : undefined,
        status,
      };
    });
}

type Tone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const shortDate = (date: string) =>
  `${Number(date.slice(8))} ${MONTHS[Number(date.slice(5, 7)) - 1]}`;

/** The one line that sums up a vaccine: what is next, or that it is done. */
export function vaccinationProgress(vaccination: VaccinationDoc, today?: string) {
  const doses = doseStatuses(vaccination, today);
  const total = doses.length;
  const given = doses.filter((dose) => dose.status === 'given').length;
  const next = doses.find((dose) => dose.status !== 'given');
  let tag: { label: string; tone: Tone };
  if (!next) tag = { label: total > 1 ? 'All doses given' : 'Given', tone: 'success' };
  else if (next.status === 'overdue')
    tag = { label: `Dose ${next.number} overdue`, tone: 'danger' };
  else if (next.status === 'due') tag = { label: `Dose ${next.number} due today`, tone: 'warning' };
  else tag = { label: `Dose ${next.number} on ${shortDate(next.dueOn)}`, tone: 'primary' };
  return { doses, total, given, next, tag };
}

/** A vaccine as the app sees it. Matches `VaccinationRecord` in `features/vaccines`. */
export function toVaccinationJson(vaccination: VaccinationDoc, doctor?: DoctorDoc) {
  const { doses, total, given, tag } = vaccinationProgress(vaccination);
  const amount = vaccination.dose?.amount;
  return {
    id: String(vaccination._id),
    name: vaccination.name,
    doctor: doctor && {
      id: String(doctor._id),
      name: displayName(doctor.name),
      qualifications: doctor.qualifications ?? undefined,
      registrationNumber: doctor.registrationNumber,
      council: doctor.council ?? undefined,
    },
    prescriptionId: vaccination.prescription ? String(vaccination.prescription) : undefined,
    doseText: amount != null ? `${amount} ${vaccination.dose?.unit ?? ''}`.trim() : undefined,
    route: vaccination.route
      ? (ROUTES[vaccination.route] ?? humanize(vaccination.route))
      : undefined,
    site: vaccination.site ? humanize(vaccination.site) : undefined,
    instructions: vaccination.instructions?.trim() || undefined,
    schedule: scheduleText(vaccination),
    doses,
    totalDoses: total,
    givenDoses: given,
    tag,
    prescribedAt: (vaccination.createdAt ?? new Date()).toISOString(),
  };
}
