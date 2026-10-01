import { Colors } from '@/constants/theme';
import { type BloodGroup, type PlanId } from '@/types';

/** What a member can show or hide on the public emergency view. */
export const EMERGENCY_FIELDS = [
  { id: 'bloodGroup', label: 'Blood group' },
  { id: 'allergies', label: 'Allergies' },
  { id: 'conditions', label: 'Conditions' },
  { id: 'medicines', label: 'Medicines' },
  { id: 'contacts', label: 'Family contacts' },
  { id: 'organDonor', label: 'Organ donor' },
  { id: 'insurance', label: 'Insurance' },
  { id: 'homeAddress', label: 'Home address' },
] as const;

export type EmergencyFieldId = (typeof EMERGENCY_FIELDS)[number]['id'];

/**
 * SAMPLE DATA from the brochure mock-up, so the Card screens can be designed
 * before the member and emergency-profile APIs exist. Replace with API data.
 * The QR points at the brochure's example link, not a real profile.
 */
export const sampleCard = {
  member: {
    name: 'Rohan Sharma',
    firstName: 'Rohan',
    initials: 'PS',
    about: 'Female, 38 years',
    memberId: '482910573316',
    plan: 'plus' as PlanId,
    bloodGroup: 'O+' as BloodGroup,
    memberSince: '09/26',
    validThru: '09/27',
    abhaLinked: true,
  },
  emergencyUrl: 'https://cloudspital.ai/e/7Q2K9',
  lockScreenQr: true,
  hiddenFields: ['homeAddress'] as EmergencyFieldId[],
  profile: {
    allergies: ['Sulfa drugs'],
    conditions: [] as string[],
    medicines: [] as string[],
    contacts: [
      { name: 'Vikram Sharma', relation: 'Family' },
      { name: 'Mohan Sharma', relation: 'Family' },
    ],
    organDonor: true,
    insurance: 'Policy on file',
    homeAddress: 'Address on file',
  },
  family: [
    { initials: 'VS', color: Colors.inkMid },
    { initials: 'AS', color: Colors.primaryMid },
    { initials: 'MS', color: Colors.success },
  ],
};

/** "482910573316" -> "HM 4829 1057 3316" */
export function formatMemberId(memberId: string) {
  return `HM ${memberId.replace(/(\d{4})(?=\d)/g, '$1 ')}`;
}
