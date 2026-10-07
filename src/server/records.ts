import { type Types } from 'mongoose';

import { displayName } from './doctors';
import { HttpError } from './http';
import {
  ConsultModel,
  DoctorModel,
  PrescriptionModel,
  VaccinationModel,
  type Doctor,
  type Prescription,
} from './models';
import { mongoose } from './mongoose';
import { istDate, toVaccinationJson, type VaccinationDoc } from './vaccinations';

// The records timeline. Each kind of record lives in its own collection, written by the doctor
// app; this file reads them and shapes them for the app. Prescriptions and vaccines for now;
// reports join when their collection exists.

type Id = Types.ObjectId;
type DoctorDoc = Doctor & { _id: Id };
type PrescriptionDoc = Prescription & { _id: Id; createdAt?: Date };

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

function prescriptionSummary({ prescription, consult, doctor }: LoadedPrescription) {
  const at = prescription.signedAt ?? prescription.createdAt ?? new Date();
  const items = (prescription.items ?? []).map((item) => item.trim()).filter(Boolean);
  const doctorName = doctor ? displayName(doctor.name) : 'Your doctor';
  const reason = reasonTitle(consult?.reason);

  return {
    id: String(prescription._id),
    type: 'prescription' as const,
    title: reason ? `Prescription for ${reason.toLowerCase()}` : 'Prescription',
    subtitle: `${doctorName}${consult ? ', video consult' : ''} · ${items.length} ${items.length === 1 ? 'item' : 'items'}`,
    date: istDate(at),
    at: at.toISOString(),
    tag:
      Date.now() - at.getTime() < NEW_FOR_MS
        ? { label: 'New from your doctor', tone: 'primary' as const }
        : undefined,
    /** Extra words the search box matches: the doctor, the reason and every line. */
    keywords: [doctorName, consult?.reason, ...items].filter(Boolean).join(' '),
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

/** The member's timeline, newest first. */
export async function listRecords(memberId: Id) {
  const [prescriptions, vaccinations] = await Promise.all([
    loadPrescriptions(memberId),
    loadVaccinations(memberId),
  ]);
  const rows = [...prescriptions.map(prescriptionSummary), ...vaccinations.map(vaccinationSummary)];
  return rows.sort((a, b) => b.at.localeCompare(a.at));
}

/** One record in full: a prescription with its vaccines, or a vaccine with its doses. */
export async function getRecord(memberId: Id, id: string) {
  if (!/^[a-f\d]{24}$/i.test(id)) throw new HttpError(404, 'This record no longer exists');
  const _id = new mongoose.Types.ObjectId(id);

  const [row] = await loadPrescriptions(memberId, _id);
  if (row) {
    const { prescription, consult, doctor } = row;
    const vaccines = await loadVaccinations(memberId, { prescription: _id });
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

  throw new HttpError(404, 'This record no longer exists');
}
