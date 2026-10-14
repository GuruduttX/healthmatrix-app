import { type Types } from 'mongoose';

import { displayName } from './doctors';
import { HttpError } from './http';
import { getMobilabReportUrl, labCatalog } from './mobilab';
import { progressOf } from './pod-bookings';
import {
  BookingModel,
  ConsultModel,
  DoctorModel,
  HealthRecordModel,
  PrescriptionModel,
  VaccinationModel,
  type Doctor,
  type HealthRecord,
  type Prescription,
} from './models';
import { mongoose } from './mongoose';
import { istDate, toVaccinationJson, type VaccinationDoc } from './vaccinations';

// The records timeline. Each kind of record lives in its own collection: prescriptions and
// vaccines written by the doctor app, pod screenings filed from Mobilab's results
// (`server/pod-bookings.ts`). This file reads them and shapes them for the app.

type Id = Types.ObjectId;
type DoctorDoc = Doctor & { _id: Id };
type PrescriptionDoc = Prescription & { _id: Id; createdAt?: Date };
type ScreeningDoc = HealthRecord & { _id: Id };
type ScreeningValue = NonNullable<HealthRecord['values']>[number];

/** Drafts and withdrawn prescriptions are the doctor's business, not the member's. */
const HIDDEN_STATUSES = ['draft', 'cancelled', 'void', 'deleted'];
/** Prescriptions this recent are tagged "New". */
const NEW_FOR_MS = 3 * 24 * 60 * 60 * 1000;

/** "cold and cough" -> "Cold and cough", shortened for a title. */
function reasonTitle(reason?: string | null) {
  const text = reason?.trim().replace(/\s+/g, ' ');
  if (!text) return undefined;
  const short = text.length > 40 ? `${text.slice(0, 39).trimEnd()}…` : text;
  return short[0]!.toUpperCase() + short.slice(1);
}

/** "BCG" -> "BCG vaccine"; names that already say so are left alone. */
export function vaccineTitle(name: string) {
  return /vaccin/i.test(name) ? name : `${name} vaccine`;
}

async function doctorsById(ids: (Id | null | undefined)[]) {
  const doctors = await DoctorModel.find({ _id: { $in: ids.filter(Boolean) } }).lean<DoctorDoc[]>();
  return (id?: Id | null) => doctors.find((doctor) => String(doctor._id) === String(id));
}

/** The member's prescriptions with their consults and doctors. */
async function loadPrescriptions(memberId: Id, only?: Id) {
  const prescriptions = await PrescriptionModel.find({
    member: memberId,
    status: { $nin: HIDDEN_STATUSES },
    ...(only && { _id: only }),
  }).lean<PrescriptionDoc[]>();

  const [consults, doctorFor] = await Promise.all([
    ConsultModel.find({ _id: { $in: prescriptions.map((p) => p.consult).filter(Boolean) } }).lean(),
    doctorsById(prescriptions.map((p) => p.doctor)),
  ]);

  return prescriptions.map((prescription) => ({
    prescription,
    consult: consults.find((c) => String(c._id) === String(prescription.consult)),
    doctor: doctorFor(prescription.doctor),
  }));
}

/** The member's vaccines with their doctors. */
export async function loadVaccinations(memberId: Id, filter: Record<string, unknown> = {}) {
  const vaccinations = await VaccinationModel.find({ member: memberId, ...filter }).lean<
    VaccinationDoc[]
  >();
  const doctorFor = await doctorsById(vaccinations.map((v) => v.doctor));
  return vaccinations.map((vaccination) => ({
    vaccination,
    doctor: doctorFor(vaccination.doctor),
  }));
}

type LoadedPrescription = Awaited<ReturnType<typeof loadPrescriptions>>[number];
type LoadedVaccination = Awaited<ReturnType<typeof loadVaccinations>>[number];

/** The tests a doctor ordered on a prescription, with names; entries missing a code are dropped. */
function orderedTests(prescription: Pick<Prescription, 'tests'>) {
  return (prescription.tests ?? []).flatMap((entry) =>
    entry.code && entry.name
      ? [
          {
            kind: entry.kind === 'test' ? ('test' as const) : ('profile' as const),
            code: entry.code,
            name: entry.name.trim(),
            tests: entry.tests?.length ? entry.tests : [entry.code],
          },
        ]
      : [],
  );
}

function prescriptionSummary({ prescription, consult, doctor }: LoadedPrescription) {
  const at = prescription.signedAt ?? prescription.createdAt ?? new Date();
  const items = (prescription.items ?? []).map((item) => item.trim()).filter(Boolean);
  const tests = orderedTests(prescription);
  const lines = items.length + tests.length;
  const doctorName = doctor ? displayName(doctor.name) : 'Your doctor';
  const reason = reasonTitle(consult?.reason);

  return {
    id: String(prescription._id),
    type: 'prescription' as const,
    title: reason ? `Prescription for ${reason.toLowerCase()}` : 'Prescription',
    subtitle: `${doctorName}${consult ? ', video consult' : ''} · ${lines} ${lines === 1 ? 'item' : 'items'}`,
    date: istDate(at),
    at: at.toISOString(),
    tag:
      Date.now() - at.getTime() < NEW_FOR_MS
        ? { label: 'New from your doctor', tone: 'primary' as const }
        : undefined,
    /** Extra words the search box matches: the doctor, the reason, every line and test. */
    keywords: [doctorName, consult?.reason, ...items, ...tests.map((test) => test.name)]
      .filter(Boolean)
      .join(' '),
  };
}

function vaccinationSummary({ vaccination, doctor }: LoadedVaccination) {
  const json = toVaccinationJson(vaccination, doctor);
  const doctorName = json.doctor?.name ?? 'Your doctor';
  return {
    id: json.id,
    type: 'vaccination' as const,
    title: vaccineTitle(json.name),
    subtitle: `${doctorName} · ${json.schedule}`,
    date: istDate(new Date(json.prescribedAt)),
    at: json.prescribedAt,
    tag: json.tag,
    keywords: [doctorName, json.name, 'vaccine', json.instructions].filter(Boolean).join(' '),
  };
}

const loadScreenings = (memberId: Id, only?: Id) =>
  HealthRecordModel.find({
    member: memberId,
    type: 'pod_screening',
    ...(only && { _id: only }),
  }).lean<ScreeningDoc[]>();

/** A value outside its range, or every value inside, as the row's one flag. */
function screeningSummary(record: ScreeningDoc) {
  const values = record.values ?? [];
  const outside = values.filter((value) => value.flag && value.flag !== 'normal').length;
  const where = record.provider ?? 'Arc pod';
  return {
    id: String(record._id),
    type: 'pod_screening' as const,
    title: record.title,
    subtitle: `${where} · ${values.length} ${values.length === 1 ? 'test' : 'tests'}${record.isSample ? ' · sample values' : ''}`,
    date: istDate(record.recordedAt),
    at: record.recordedAt.toISOString(),
    tag: outside
      ? { label: `${outside} outside range`, tone: 'warning' as const }
      : { label: 'All in range', tone: 'success' as const },
    keywords: [where, 'pod', ...values.map((value) => value.name)].join(' '),
  };
}

/** 0.2900001 -> "0.29" */
const num = (n: number) => String(Number(n.toFixed(2)));

/**
 * A value as the app's `ValueRow` draws it (`RecordValue` in `features/records`): the range in
 * words, a flag, and a bar with the normal range in the middle, low below it and high above.
 */
function toRecordValue(value: ScreeningValue, index: number) {
  const low = value.referenceRange?.low ?? undefined;
  const high = value.referenceRange?.high ?? undefined;
  const unit = value.unit ? ` ${value.unit}` : '';
  const range =
    low !== undefined && high !== undefined
      ? `Normal ${num(low)}–${num(high)}${unit}`
      : high !== undefined
        ? `Normal up to ${num(high)}${unit}`
        : low !== undefined
          ? `Normal from ${num(low)}${unit}`
          : value.referenceRange?.text
            ? `Normal: ${value.referenceRange.text}`
            : 'No reference range from the lab';
  const status =
    value.flag === 'high'
      ? { label: 'High', tone: 'danger' as const }
      : value.flag === 'low'
        ? { label: 'Low', tone: 'warning' as const }
        : { label: 'Normal', tone: 'success' as const };

  // The bar shows half the normal range's width again on each side, and always reaches the value.
  const from = low ?? 0;
  const to = high ?? Math.max(from * 2, value.value * 1.2, 1);
  const width = to - from || to || 1;
  const scaleMin = low !== undefined && low > 0 ? Math.max(0, low - width / 2) : from;
  const top = Math.max(to + width / 2, value.value * 1.05);
  const bands =
    low === undefined && high === undefined
      ? [{ upTo: top, tone: 'success' as const }]
      : [
          ...(low !== undefined && low > scaleMin ? [{ upTo: low, tone: 'warning' as const }] : []),
          { upTo: to, tone: 'success' as const },
          ...(high !== undefined ? [{ upTo: top, tone: 'danger' as const }] : []),
        ];

  return {
    id: `${value.code ?? value.name}-${index}`,
    name: value.name,
    value: value.value,
    unit: value.unit ?? '',
    range,
    status,
    scaleMin,
    bands,
  };
}

/** The values under each health check they were booked with, single tests last. */
function screeningGroups(values: ScreeningValue[]) {
  const named = [...new Set(values.map((value) => value.group).filter(Boolean))] as string[];
  const groups = named.map((title) => ({
    title,
    values: values.flatMap((value, i) => (value.group === title ? [toRecordValue(value, i)] : [])),
  }));
  const rest = values.flatMap((value, i) => (value.group ? [] : [toRecordValue(value, i)]));
  if (rest.length) groups.push({ title: named.length ? 'Other tests' : 'Tests', values: rest });
  return groups;
}

/** The member's timeline, newest first. */
export async function listRecords(memberId: Id) {
  const [prescriptions, vaccinations, screenings] = await Promise.all([
    loadPrescriptions(memberId),
    loadVaccinations(memberId),
    loadScreenings(memberId),
  ]);
  const rows = [
    ...prescriptions.map(prescriptionSummary),
    ...vaccinations.map(vaccinationSummary),
    ...screenings.map(screeningSummary),
  ];
  return rows.sort((a, b) => b.at.localeCompare(a.at));
}

/** One record in full: a prescription with its vaccines, or a vaccine with its doses. */
export async function getRecord(memberId: Id, id: string) {
  if (!/^[a-f\d]{24}$/i.test(id)) throw new HttpError(404, 'This record no longer exists');
  const _id = new mongoose.Types.ObjectId(id);

  const [row] = await loadPrescriptions(memberId, _id);
  if (row) {
    const { prescription, consult, doctor } = row;
    const ordered = orderedTests(prescription);
    const [vaccines, bookings, catalog] = await Promise.all([
      loadVaccinations(memberId, { prescription: _id }),
      // Newest first, so a test booked twice shows its latest booking.
      BookingModel.find({ member: memberId, prescription: _id }).sort({ createdAt: -1 }).lean(),
      // Names for the tests inside each health check. Without the pod catalog the codes show.
      ordered.length ? labCatalog().catch(() => null) : null,
    ]);
    const testName = (code: string) =>
      catalog?.tests.find((test) => test.code === code)?.name ?? code;
    /** The booking made from this prescription that covers every test of `codes`, if any. */
    const bookingFor = (codes: string[]) => {
      const booking = bookings.find((item) => codes.every((code) => item.tests.includes(code)));
      return (
        booking && {
          id: String(booking._id),
          progress: progressOf(booking.mobilab?.status),
          recordId: booking.result ? String(booking.result) : undefined,
        }
      );
    };
    return {
      ...prescriptionSummary(row),
      doctor: doctor && {
        id: String(doctor._id),
        name: displayName(doctor.name),
        qualifications: doctor.qualifications ?? undefined,
        registrationNumber: doctor.registrationNumber,
        council: doctor.council ?? undefined,
        specialties: doctor.specialties,
      },
      consult: consult && {
        specialty: consult.specialty ?? undefined,
        reason: consult.reason ?? undefined,
        scheduledAt: consult.scheduledAt.toISOString(),
      },
      prescription: {
        items: (prescription.items ?? []).map((item) => item.trim()).filter(Boolean),
        /** Tests to book at a pod, each with the booking made for it from here, once there is one. */
        tests: ordered.map((test) => ({
          ...test,
          /** The names of the tests it covers, in the same order as `tests`. */
          testNames: test.tests.map(testName),
          booking: bookingFor(test.tests),
        })),
        status: prescription.status ?? undefined,
        signedAt: prescription.signedAt?.toISOString(),
      },
      vaccines: vaccines.map(vaccinationSummary),
    };
  }

  const [vaccine] = await loadVaccinations(memberId, { _id });
  if (vaccine) {
    return {
      ...vaccinationSummary(vaccine),
      vaccination: toVaccinationJson(vaccine.vaccination, vaccine.doctor),
    };
  }

  const [screening] = await loadScreenings(memberId, _id);
  if (screening) {
    return {
      ...screeningSummary(screening),
      screening: {
        provider: screening.provider ?? 'Arc pod',
        groups: screeningGroups(screening.values ?? []),
        remarks: screening.remarks ?? undefined,
        disclaimers: screening.disclaimers ?? [],
        isSample: Boolean(screening.isSample),
        /** The PDF opens from `/records/<id>/report`. */
        hasReport: Boolean(screening.booking),
      },
    };
  }

  throw new HttpError(404, 'This record no longer exists');
}

/** A fresh link to a pod screening's PDF report; Mobilab's links last about an hour. */
export async function screeningReportUrl(memberId: Id, id: string) {
  if (!/^[a-f\d]{24}$/i.test(id)) throw new HttpError(404, 'This record no longer exists');
  const record = await HealthRecordModel.findOne({ _id: id, member: memberId, type: 'pod_screening' })
    .select('booking')
    .lean<{ booking?: Id }>();
  const booking = record?.booking && (await BookingModel.findById(record.booking).select('mobilab'));
  const reference = booking ? booking.mobilab?.bookingId : undefined;
  if (!reference) throw new HttpError(404, 'This record has no report');
  const url = await getMobilabReportUrl(reference);
  if (!url) throw new HttpError(404, 'The report isn’t ready yet. Try again in a little while.');
  return url;
}
