import { type PlanId } from '@/types';

type Plan = {
  id: PlanId;
  name: string;
  audience: string;
  /** Rupees per year; null where pricing is per-group. Indicative launch pricing. */
  pricePerYear: number | null;
  summary: string;
};

export const Plans: Record<PlanId, Plan> = {
  essential: {
    id: 'essential',
    name: 'Essential',
    audience: 'Free',
    pricePerYear: 0,
    summary: 'Digital card, emergency QR, records and basic Ekaay.',
  },
  plus: {
    id: 'plus',
    name: 'Plus',
    audience: 'Individuals',
    pricePerYear: 1499,
    summary: 'Advanced Ekaay, pod screenings and doctor consults.',
  },
  family: {
    id: 'family',
    name: 'Family',
    audience: 'Up to four',
    pricePerYear: 3999,
    summary: 'Everyone on one plan, with caregiver access.',
  },
  senior_care: {
    id: 'senior_care',
    name: 'Senior Care',
    audience: 'Parents',
    pricePerYear: 2499,
    summary: 'Monthly vitals, medicine tracking, family in the loop.',
  },
  community: {
    id: 'community',
    name: 'Community',
    audience: 'Groups',
    pricePerYear: null,
    summary: 'Co-branded cards for societies, employers and groups.',
  },
};
