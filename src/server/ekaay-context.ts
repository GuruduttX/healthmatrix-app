import { type Types } from 'mongoose';

import { DOCTOR_FIELDS, type PopulatedDoctor } from './consults';
import { displayName } from './doctors';
import {
  BookingModel,
  ConsultModel,
  EmergencyProfileModel,
  HealthRecordModel,
  ReminderModel,
  type Doctor,
  type HealthRecord,
  type Member,
} from './models';
import { progressOf } from './pod-bookings';
import { loadPrescriptions, loadVaccinations, orderedTests, vaccineTitle } from './records';
import { TIME_ZONE } from './schedule';
import { doseStatuses, istDate } from './vaccinations';

// Everything Ekaay knows about the member, gathered fresh for each question and sent to the
// model as JSON. Only what helps answer a health question: never phone numbers, the ABHA number,
// emergency contacts or the insurance policy.

type Id = Types.ObjectId;
type MemberDoc = Member & { _id: Id };
type TestRecordDoc = HealthRecord & { _id: Id };

/** The newest this many of each kind; older ones rarely change an answer and cost tokens. */
const LIMITS = { tests: 40, prescriptions: 30, consults: 20, bookings: 15 };
/** Dose marks counted for each medicine. */
const ADHERENCE_DAYS = 30;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** 0.2900001 -> 0.29 */
const round = (n: number) => Number(n.toFixed(2));

/** "15 Oct 2026, 4:30 pm", India time. */
const istDateTime = (at: Date) =>
  at.toLocaleString('en-IN', { timeZone: TIME_ZONE, dateStyle: 'medium', timeStyle: 'short' });

function ageOn(dateOfBirth: Date, today: Date) {
  let age = today.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  const birthday = new Date(dateOfBirth);
  birthday.setUTCFullYear(today.getUTCFullYear());
  if (birthday > today) age -= 1;
  return age;
}

/** The key a value is charted by: its code, or its name for labs that send none. */
export const valueKey = (value: { code?: string | null; name: string }) =>
  value.code?.trim() || value.name.trim().toLowerCase();

function rangeText(range?: { low?: number | null; high?: number | null; text?: string | null } | null) {
  const low = range?.low ?? undefined;
  const high = range?.high ?? undefined;
  if (low !== undefined && high !== undefined) return `${round(low)}–${round(high)}`;
  if (high !== undefined) return `up to ${round(high)}`;
  if (low !== undefined) return `from ${round(low)}`;
  return range?.text ?? undefined;
}

function testResult(record: TestRecordDoc) {
  return {
    id: String(record._id),
    kind: record.type === 'pod_screening' ? 'pod screening' : 'lab report',
    title: record.title,
    date: istDate(record.recordedAt),
    where: record.provider ?? undefined,
    ...(record.isSample && { sampleValuesNotReal: true }),
    values: (record.values ?? []).map((value) => ({
      key: valueKey(value),
      name: value.name,
      value: round(value.value),
      unit: value.unit ?? undefined,
      normal: rangeText(value.referenceRange),
      flag: value.flag ?? undefined,
      healthCheck: value.group ?? undefined,
    })),
    pathologistRemarks: record.remarks ?? undefined,
    note: record.ekaayNote ?? undefined,
  };
}

type DoctorDoc = Doctor & { _id: Id };
const doctorOf = (doctor?: DoctorDoc | null) =>
  doctor
    ? {
        name: displayName(doctor.name),
        qualifications: doctor.qualifications ?? undefined,
        specialties: doctor.specialties,
      }
    : undefined;

/** The member's records, shaped for the model, and the readings behind any chart it asks for. */
export async function loadEkaayContext(member: MemberDoc) {
  const memberId = member._id;
  const now = new Date();
  const since = istDate(new Date(now.getTime() - ADHERENCE_DAYS * 86_400_000));

  const [emergency, tests, prescriptions, vaccinations, reminders, consults, bookings] =
    await Promise.all([
      EmergencyProfileModel.findOne({ member: memberId }).lean(),
      HealthRecordModel.find({ member: memberId, type: { $in: ['pod_screening', 'lab_report'] } })
        .sort({ recordedAt: -1 })
        .limit(LIMITS.tests)
        .lean<TestRecordDoc[]>(),
      loadPrescriptions(memberId),
      loadVaccinations(memberId),
      ReminderModel.find({ member: memberId, kind: { $in: ['medicine', 'test'] } }).lean(),
      ConsultModel.find({ member: memberId })
        .sort({ scheduledAt: -1 })
        .limit(LIMITS.consults)
        .populate<PopulatedDoctor>('doctor', DOCTOR_FIELDS)
        .lean(),
      BookingModel.find({ member: memberId })
        .sort({ createdAt: -1 })
        .limit(LIMITS.bookings)
        .lean(),
    ]);

  const signedAt = (prescription: { signedAt?: Date | null; createdAt?: Date }) =>
    prescription.signedAt ?? prescription.createdAt ?? now;
  const newestPrescriptions = prescriptions
    .sort((a, b) => signedAt(b.prescription).getTime() - signedAt(a.prescription).getTime())
    .slice(0, LIMITS.prescriptions);

  const context = {
    today: istDate(now),
    member: {
      name: member.name,
      age: member.dateOfBirth ? ageOn(member.dateOfBirth, now) : undefined,
      gender: member.gender ?? undefined,
      bloodGroup: member.bloodGroup ?? undefined,
      plan: member.plan,
    },
    /** What the member filled in on their emergency card. */
    healthProfile: emergency
      ? {
          allergies: emergency.allergies ?? [],
          conditions: emergency.conditions ?? [],
          regularMedicines: emergency.medicines ?? [],
          organDonor: emergency.organDonor ?? undefined,
        }
      : undefined,
    /** Newest first. */
    testResults: tests.map(testResult),
    /** Newest first. */
    prescriptions: newestPrescriptions.map(({ prescription, consult, doctor }) => ({
      id: String(prescription._id),
      date: istDate(signedAt(prescription)),
      doctor: doctorOf(doctor),
      reasonForConsult: consult?.reason ?? undefined,
      items: (prescription.items ?? []).map((item) => item.trim()).filter(Boolean),
      testsOrdered: orderedTests(prescription).map((test) => test.name),
    })),
    vaccines: vaccinations.map(({ vaccination, doctor }) => ({
      id: String(vaccination._id),
      name: vaccineTitle(vaccination.name),
      prescribedBy: doctorOf(doctor)?.name,
      dose:
        vaccination.dose?.amount != null
          ? `${vaccination.dose.amount} ${vaccination.dose.unit ?? ''}`.trim()
          : undefined,
      route: vaccination.route ?? undefined,
      instructions: vaccination.instructions?.trim() || undefined,
      doses: doseStatuses(vaccination),
    })),
    /** Reminders the member keeps in the app; `marked` counts their taken/skipped taps. */
    medicineReminders: reminders
      .filter((reminder) => reminder.kind === 'medicine')
      .map((reminder) => {
        const recent = reminder.log.filter((entry) => entry.date >= since);
        return {
          name: reminder.title,
          dose: reminder.dose ?? undefined,
          mealTiming: reminder.mealTiming ?? undefined,
          times: reminder.times ?? [],
          frequency: reminder.frequency,
          weekdays: reminder.weekdays?.length ? reminder.weekdays : undefined,
          everyDays: reminder.everyDays ?? undefined,
          startsOn: reminder.startsOn ?? undefined,
          endsOn: reminder.endsOn ?? undefined,
          active: reminder.isActive,
          note: reminder.note ?? undefined,
          [`marked_last_${ADHERENCE_DAYS}_days`]: {
            taken: recent.filter((entry) => entry.status === 'taken').length,
            skipped: recent.filter((entry) => entry.status === 'skipped').length,
          },
        };
      }),
    testReminders: reminders
      .filter((reminder) => reminder.kind === 'test' && reminder.isActive)
      .map((reminder) => ({
        name: reminder.title,
        due: reminder.dueAt ? istDate(reminder.dueAt) : undefined,
        note: reminder.note ?? undefined,
      })),
    /** Video consults, newest first, upcoming ones included. Times are India time. */
    consults: consults.map((consult) => ({
      when: istDateTime(consult.scheduledAt),
      doctor: doctorOf(consult.doctor),
      specialty: consult.specialty ?? undefined,
      status: consult.status,
      reason: consult.reason ?? undefined,
      fromPod: consult.mode === 'video_from_pod' || undefined,
      cancelledBy: consult.cancelledBy ?? undefined,
      summary: consult.ekaaySummary ?? undefined,
    })),
    /** Tests booked at a pod, newest first. */
    podBookings: bookings.map((booking) => ({
      booked: istDate(booking.createdAt),
      pod: booking.pod?.name,
      healthChecks: booking.profiles,
      testCount: booking.tests.length,
      status: booking.status === 'cancelled' ? 'Cancelled' : progressOf(booking.mobilab?.status).label,
      resultRecordId: booking.result ? String(booking.result) : undefined,
    })),
  };

  return {
    context,
    /** Ids the model may link to, by the label their button gets. */
    records: new Map<string, string>([
      ...tests.map((r) => [String(r._id), 'See the report'] as const),
      ...newestPrescriptions.map((r) => [String(r.prescription._id), 'See the prescription'] as const),
      ...vaccinations.map((r) => [String(r.vaccination._id), 'See the vaccine'] as const),
    ]),
    trend: (key: string) => trendOf(tests, key),
  };
}

/**
 * The readings of one value over time, oldest first, as the chat's trend chart draws them.
 * Null unless there are two readings and an upper normal limit to draw the band from.
 */
function trendOf(tests: TestRecordDoc[], key: string) {
  const readings = tests
    .filter((record) => !record.isSample)
    .flatMap((record) => {
      const value = (record.values ?? []).find((v) => valueKey(v) === key);
      return value ? [{ at: record.recordedAt, value }] : [];
    })
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .slice(-6);
  const latest = readings[readings.length - 1]?.value;
  const normalMax = latest?.referenceRange?.high;
  if (readings.length < 2 || !latest || normalMax == null) return null;

  const days = readings.map(({ at }) => istDate(at));
  const oneYear = days[0]!.slice(0, 4) === days[days.length - 1]!.slice(0, 4);
  const label = (day: string, withDay: boolean) => {
    const month = MONTHS[Number(day.slice(5, 7)) - 1];
    return withDay ? `${Number(day.slice(8))} ${month}` : `${month} ${day.slice(0, 4)}`;
  };
  let labels = days.map((day) => label(day, oneYear));
  // Two readings in one month: show the day and a short year, so every point has its own label.
  if (new Set(labels).size < labels.length) {
    labels = days.map((day) => `${label(day, true)} ${day.slice(2, 4)}`);
  }

  const unit = latest.unit ? `, ${latest.unit}` : '';
  return {
    caption: `Your ${latest.name.toLowerCase()}${unit}`,
    description: `${latest.name}${latest.unit ? ` in ${latest.unit}` : ''}`,
    normalMax: round(normalMax),
    points: readings.map(({ value }, i) => ({ label: labels[i]!, value: round(value.value) })),
  };
}
