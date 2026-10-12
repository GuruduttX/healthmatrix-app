import { type ReadingFlag } from '@/types';

export type Reading = {
  id: string;
  label: string;
  value: string;
  unit: string;
  flag: ReadingFlag;
  /** Oldest to newest, for the sparkline. */
  trend: number[];
};

export type Insight = {
  /** One line, the headline of the card. */
  title: string;
  text: string;
  metric: string;
  unit: string;
  /** Upper edge of the normal range, drawn as a band on the chart. */
  normalMax: number;
  points: { label: string; value: number }[];
};

/**
 * SAMPLE DATA from the brochure mock-up, so the Home screen can be designed
 * before the readings and insights APIs exist. The pulse reading is not in the brochure; pods
 * measure it. The member's name, consults, medicines, vaccines and family are real. Replace with
 * API data.
 */
export const sampleHome = {
  readings: [
    {
      id: 'bp',
      label: 'Blood pressure',
      value: '128/84',
      unit: 'mmHg',
      flag: 'watch',
      trend: [118, 121, 120, 124, 126, 128],
    },
    {
      id: 'sugar',
      label: 'Fasting sugar',
      value: '118',
      unit: 'mg/dL',
      flag: 'high',
      trend: [96, 104, 118],
    },
    {
      id: 'spo2',
      label: 'Oxygen (SpO2)',
      value: '98',
      unit: '%',
      flag: 'normal',
      trend: [97, 98, 98, 97, 98, 98],
    },
    {
      id: 'pulse',
      label: 'Resting pulse',
      value: '72',
      unit: 'bpm',
      flag: 'normal',
      trend: [76, 74, 75, 73, 72, 72],
    },
  ] satisfies Reading[],
  insight: {
    title: 'Your fasting sugar is creeping up',
    text: 'Up in each of your last three tests. An HbA1c test will show what it means.',
    metric: 'Fasting sugar',
    unit: 'mg/dL',
    normalMax: 99,
    points: [
      { label: 'Aug 2024', value: 96 },
      { label: 'Mar 2026', value: 104 },
      { label: 'Sep 2026', value: 118 },
    ],
  } satisfies Insight,
  emergencyQr: { isOn: true, carriers: 'Card, lock screen and helmet tag' },
};
