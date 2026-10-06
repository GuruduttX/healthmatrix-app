import { type Types } from 'mongoose';

import { displayName } from './doctors';
import { HttpError } from './http';
import {
  ConsultModel,
  DoctorModel,
  PrescriptionModel,
  type Doctor,
  type Prescription,
} from './models';
import { mongoose } from './mongoose';

// The records timeline. Each kind of record lives in its own collection, written by the doctor
// app; this file reads them and shapes them for the app. Prescriptions only, for now: reports
// and vaccines join the timeline when their collections exist.

type Id = Types.ObjectId;
type DoctorDoc = Doctor & { _id: Id };
type PrescriptionDoc = Prescription & { _id: Id; createdAt?: Date };

/** Drafts and withdrawn prescriptions are the doctor's business, not the member's. */
const HIDDEN_STATUSES = ['draft', 'cancelled', 'void', 'deleted'];
/** Prescriptions this recent are tagged "New". */
const NEW_FOR_MS = 3 * 24 * 60 * 60 * 1000;
const IST_OFFSET_MS = 330 * 60 * 1000;

/** The India-time day of an instant: "2026-10-06". */
const istDate = (at: Date) => new Date(at.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);

/** "cold and cough" -> "Cold and cough", shortened for a title. */
function reasonTitle(reason?: string | null) {
  const text = reason?.trim().replace(/\s+/g, ' ');
  if (!text) return undefined;
  const short = text.length > 40 ? `${text.slice(0, 39).trimEnd()}…` : text;
  return short[0]!.toUpperCase() + short.slice(1);
}

/** The member's prescriptions with their consults and doctors, in three queries. */
async function load(memberId: Id, only?: Id) {
  const prescriptions = await PrescriptionModel.find({
    member: memberId,
    status: { $nin: HIDDEN_STATUSES },
    ...(only && { _id: only }),
  }).lean<PrescriptionDoc[]>();

  const [consults, doctors] = await Promise.all([
    ConsultModel.find({ _id: { $in: prescriptions.map((p) => p.consult).filter(Boolean) } }).lean(),
    DoctorModel.find({ _id: { $in: prescriptions.map((p) => p.doctor) } }).lean<DoctorDoc[]>(),
  ]);

  return prescriptions.map((prescription) => ({
    prescription,
    consult: consults.find((c) => String(c._id) === String(prescription.consult)),
    doctor: doctors.find((d) => String(d._id) === String(prescription.doctor)),
  }));
}

type Loaded = Awaited<ReturnType<typeof load>>[number];

function summary({ prescription, consult, doctor }: Loaded) {
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

/** The member's timeline, newest first. */
export async function listRecords(memberId: Id) {
  const rows = (await load(memberId)).map(summary);
  return rows.sort((a, b) => b.at.localeCompare(a.at));
}

/** One prescription in full: who wrote it, for which consult, and every line on it. */
export async function getRecord(memberId: Id, id: string) {
  if (!/^[a-f\d]{24}$/i.test(id)) throw new HttpError(404, 'This record no longer exists');
  const [row] = await load(memberId, new mongoose.Types.ObjectId(id));
  if (!row) throw new HttpError(404, 'This record no longer exists');

  const { prescription, consult, doctor } = row;
  return {
    ...summary(row),
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
  };
}
