/** Domain types shared across features. Mirrors `server/src/constants`. */

export type PlanId = 'essential' | 'plus' | 'family' | 'senior_care' | 'community';

export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

export type RecordType = 'pod_screening' | 'lab_report' | 'prescription' | 'vaccination';

export type ReadingFlag = 'normal' | 'watch' | 'borderline' | 'high' | 'low';

export type Member = {
  id: string;
  memberId: string; // "HM 4829 1057 3316"
  name: string;
  phone: string;
  bloodGroup?: BloodGroup;
  plan: PlanId;
  abhaLinked: boolean;
  memberSince: string;
  validThru?: string;
};
