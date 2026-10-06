import { type Tone } from '@/components/ui/icon-tile';
import { type Specialty } from '@/features/doctors/types';
import { type RecordType } from '@/types';

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
};
