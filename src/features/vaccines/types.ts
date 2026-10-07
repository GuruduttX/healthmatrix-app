import { type Tone } from '@/components/ui/icon-tile';

export type VaccineDoseStatus = 'given' | 'overdue' | 'due' | 'upcoming';

export type VaccineDose = {
  number: number;
  /** India-time day, "2026-10-13". */
  dueOn: string;
  givenOn?: string;
  status: VaccineDoseStatus;
};

/** Matches `toVaccinationJson` in `src/server/vaccinations.ts`. */
export type VaccinationRecord = {
  id: string;
  name: string; // "BCG"
  doctor?: {
    id: string;
    name: string;
    qualifications?: string;
    registrationNumber: string;
    council?: string;
  };
  prescriptionId?: string;
  doseText?: string; // "0.5 mL"
  route?: string; // "Under the skin (subcutaneous)"
  site?: string; // "Left upper arm"
  instructions?: string;
  schedule: string; // "3 doses, 1 week apart"
  doses: VaccineDose[];
  totalDoses: number;
  givenDoses: number;
  tag: { label: string; tone: Tone };
  prescribedAt: string;
};
