import { type Tone } from '@/components/ui/icon-tile';
import { type Specialty } from '@/features/doctors/types';
import { type VaccinationRecord } from '@/features/vaccines/types';
import { type RecordType } from '@/types';

import { type RecordValue } from './record-details';

/** One row on the timeline. Matches `summary` in `src/server/records.ts`. */
export type RecordSummary = {
  id: string;
  type: RecordType;
  title: string;
  subtitle: string;
  /** India-time day, "2026-10-06". */
  date: string;
  at: string;
  tag?: { label: string; tone: Tone };
  /** Extra words the search matches: doctor, reason, medicines. */
  keywords: string;
};

/** A prescription opened up. Matches `getRecord` in `src/server/records.ts`. */
export type PrescriptionRecord = RecordSummary & {
  type: 'prescription';
  doctor?: {
    id: string;
    name: string;
    qualifications?: string;
    registrationNumber: string;
    council?: string;
    specialties: Specialty[];
  };
  consult?: { specialty?: Specialty; reason?: string; scheduledAt: string };
  prescription: { items: string[]; status?: string; signedAt?: string };
  /** Vaccines prescribed alongside, each a record of its own. */
  vaccines: RecordSummary[];
};

/** A vaccine opened up. */
export type VaccineRecord = RecordSummary & { type: 'vaccination'; vaccination: VaccinationRecord };

/** A pod screening opened up: Mobilab's readings, grouped by the health check they came with. */
export type ScreeningRecord = RecordSummary & {
  type: 'pod_screening';
  screening: {
    provider: string;
    groups: { title: string; values: RecordValue[] }[];
    /** The pathologist's remarks on the booking. */
    remarks?: string;
    disclaimers: string[];
    /** From a Mobilab test booking: synthetic values, not a real reading. */
    isSample: boolean;
    /** The PDF opens from `/records/<id>/report`. */
    hasReport: boolean;
  };
};

/** What `/records/<id>` returns: a prescription, a vaccine or a pod screening. */
export type OpenRecord = PrescriptionRecord | VaccineRecord | ScreeningRecord;
