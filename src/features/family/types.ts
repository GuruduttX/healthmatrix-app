import { type Appointment } from '@/features/doctors/types';
import { type RecordSummary } from '@/features/records/types';
import { type MedicineReminder } from '@/features/reminders/types';
import { type VaccinationRecord } from '@/features/vaccines/types';
import { type BloodGroup, type Gender } from '@/types';

/** Mirrors `FAMILY_RELATIONS` in `src/server/constants.ts`. */
export type Relation = 'spouse' | 'child' | 'parent' | 'sibling' | 'grandparent' | 'other';

/** Someone in the member's family. Matches `toFamilyMemberJson` in `src/server/family.ts`. */
export type FamilyMember = {
  /** The link itself, for removing them. */
  linkId: string;
  id: string;
  name: string;
  memberId: string;
  relation: Relation;
  /** How they're related in the member's own words, for "other": "Cousin", "Friend". */
  relationName?: string;
  /** Relative to the API base URL. */
  photoUrl?: string;
  gender?: Gender;
  bloodGroup?: BloodGroup;
  age?: number;
  addedAt?: string;
};

/** Someone who can see the member's records. Matches `toFamilyViewerJson`. */
export type FamilyViewer = {
  linkId: string;
  id: string;
  name: string;
  photoUrl?: string;
  /** The member as this person described them: "parent" means their parent. */
  relation: Relation;
  relationName?: string;
  addedAt?: string;
};

/** One family member's page. Matches `src/app/api/v1/family/[memberId]+api.ts`. */
export type FamilyOverview = {
  member: FamilyMember;
  health: { allergies: string[]; conditions: string[]; medicines: string[] };
  records: RecordSummary[];
  vaccinations: VaccinationRecord[];
  medicines: MedicineReminder[];
  consults: { upcoming: Appointment[]; past: Appointment[] };
};
