import { type ReadingFlag } from '@/types';

/** One stretch of a reading's scale, up to `upTo`, and what a value there means. */
export type Zone = { upTo: number; flag: ReadingFlag };

export type Reading = {
  id: string;
  label: string;
  value: string;
  unit: string;
  /** None until there is a reading (a pulse before the first face scan). */
  flag?: ReadingFlag;
  /** Oldest to newest, for the sparkline. */
  trend: number[];
  /**
   * The range bar: the scale starts at `min` and runs through each zone in turn; `at` is where
   * the reading sits on it (the top number, for blood pressure).
   */
  scale: { min: number; zones: Zone[]; at: number };
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
  /** Where the latest number came from, said on the card: "Arc pod, 28 Sep". */
  source: string;
};

/**
 * SAMPLE DATA from the brochure mock-up, so the Home screen can be designed
 * before the readings and insights APIs exist. The pulse shown on Home is the member's latest
 * face scan (`pulse-from-scan.ts`); the one here is only its shape. The member's name, consults, medicines, vaccines and family are real. Replace with
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
      scale: {
        min: 90,
        zones: [
          { upTo: 120, flag: 'normal' },
          { upTo: 130, flag: 'watch' },
          { upTo: 160, flag: 'high' },
        ],
        at: 128,
      },
    },
    {
      id: 'sugar',
      label: 'Fasting sugar',
      value: '118',
      unit: 'mg/dL',
      flag: 'high',
      trend: [96, 104, 118],
      scale: {
        min: 60,
        zones: [
          { upTo: 70, flag: 'low' },
          { upTo: 100, flag: 'normal' },
          { upTo: 140, flag: 'high' },
        ],
        at: 118,
      },
    },
    {
      id: 'spo2',
      label: 'Oxygen (SpO2)',
      value: '98',
      unit: '%',
      flag: 'normal',
      trend: [97, 98, 98, 97, 98, 98],
      scale: {
        min: 90,
        zones: [
          { upTo: 95, flag: 'low' },
          { upTo: 100, flag: 'normal' },
        ],
        at: 98,
      },
    },
    {
      id: 'pulse',
      label: 'Resting pulse',
      value: '72',
      unit: 'bpm',
      flag: 'normal',
      trend: [76, 74, 75, 73, 72, 72],
      scale: {
        min: 40,
        zones: [
          { upTo: 60, flag: 'low' },
          { upTo: 100, flag: 'normal' },
          { upTo: 120, flag: 'high' },
        ],
        at: 72,
      },
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
    source: 'From your Arc pod visit, 28 Sep',
  } satisfies Insight,
  emergencyQr: { isOn: true, carriers: 'Card, lock screen and helmet tag' },
};
