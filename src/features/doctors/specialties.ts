import {
  Apple,
  Baby,
  Brain,
  Droplet,
  HeartPulse,
  ScanFace,
  Stethoscope,
  Venus,
  type LucideIcon,
} from 'lucide-react-native';

import { type Tone } from '@/components/ui/icon-tile';

import { type Specialty } from './types';

export type SpecialtyInfo = {
  id: Specialty;
  label: string;
  icon: LucideIcon;
  /** Colour of its tile on the Care tab. */
  tone: Tone;
  /** For a small tile, where the full label would wrap too far. */
  short: string;
  /** One line on what they help with, shown above the doctor list. */
  blurb: string;
};

/** The specialties on the network, in the order the Care tab shows them. */
export const SPECIALTIES: SpecialtyInfo[] = [
  {
    id: 'general_medicine',
    label: 'General medicine',
    icon: Stethoscope,
    tone: 'primary',
    short: 'General physician',
    blurb: 'Fever, infections, aches and everyday health. A good first stop.',
  },
  {
    id: 'diabetes_endocrinology',
    label: 'Diabetes and endocrinology',
    icon: Droplet,
    tone: 'warning',
    short: 'Diabetes & thyroid',
    blurb: 'Blood sugar, thyroid and other hormone conditions.',
  },
  {
    id: 'cardiology',
    label: 'Cardiology',
    icon: HeartPulse,
    tone: 'danger',
    short: 'Heart',
    blurb: 'Heart health, blood pressure and cholesterol.',
  },
  {
    id: 'paediatrics',
    label: 'Paediatrics',
    icon: Baby,
    tone: 'success',
    short: 'Children',
    blurb: 'Care for babies, children and teenagers.',
  },
  {
    id: 'gynaecology',
    label: 'Gynaecology',
    icon: Venus,
    tone: 'primary',
    short: 'Women’s health',
    blurb: 'Periods, pregnancy, fertility and women’s health.',
  },
  {
    id: 'dermatology',
    label: 'Dermatology',
    icon: ScanFace,
    tone: 'warning',
    short: 'Skin & hair',
    blurb: 'Skin, hair and nail problems.',
  },
  {
    id: 'psychiatry',
    label: 'Psychiatry',
    icon: Brain,
    tone: 'neutral',
    short: 'Mind',
    blurb: 'Stress, anxiety, sleep, mood and mental health.',
  },
  {
    id: 'nutrition',
    label: 'Nutrition',
    icon: Apple,
    tone: 'success',
    short: 'Nutrition',
    blurb: 'Diet plans for weight, diabetes, heart health and more.',
  },
];

export function specialtyInfo(id: string): SpecialtyInfo | undefined {
  return SPECIALTIES.find((specialty) => specialty.id === id);
}

/** True for the specialties members can book; doctors may list others they typed. */
export const isSpecialty = (id: string): id is Specialty => Boolean(specialtyInfo(id));

/** The label for a specialty key; one a doctor typed is shown as written. */
export function specialtyLabel(id: string) {
  return specialtyInfo(id)?.label ?? id;
}
