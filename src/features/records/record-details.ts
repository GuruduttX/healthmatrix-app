import { type Tone } from '@/components/ui/icon-tile';

export type ValueBand = { upTo: number; tone: Tone };

export type RecordValue = {
  id: string;
  name: string;
  value: number;
  unit: string;
  /** The healthy range in words, e.g. "Desirable: under 200". */
  range: string;
  status: { label: string; tone: Tone };
  /** Where the range bar starts; it ends at the last band's `upTo`. */
  scaleMin: number;
  bands: ValueBand[];
};

export type RecordDetail = {
  title: string;
  /** Where the values were measured, shown after the date. */
  source: string;
  values: RecordValue[];
  explanation: string;
  shareWith: string;
};

/**
 * SAMPLE DATA from the brochure mock-up, keyed by record id. The values, ranges
 * and Ekaay's explanation are the brochure's; the band cut-offs that place each
 * marker on its bar are placeholders. Replace with the records API.
 */
export const sampleRecordDetails: Record<string, RecordDetail> = {
  'pod-2026-09': {
    title: 'Lipid profile',
    source: 'Arc Max pod, Sector 1',
    values: [
      {
        id: 'total',
        name: 'Total cholesterol',
        value: 212,
        unit: 'mg/dL',
        range: 'Desirable: under 200',
        status: { label: 'Borderline', tone: 'warning' },
        scaleMin: 100,
        bands: [
          { upTo: 200, tone: 'success' },
          { upTo: 240, tone: 'warning' },
          { upTo: 300, tone: 'danger' },
        ],
      },
      {
        id: 'ldl',
        name: 'LDL cholesterol',
        value: 142,
        unit: 'mg/dL',
        range: 'Optimal: under 100',
        status: { label: 'Borderline high', tone: 'warning' },
        scaleMin: 40,
        bands: [
          { upTo: 100, tone: 'success' },
          { upTo: 160, tone: 'warning' },
          { upTo: 220, tone: 'danger' },
        ],
      },
      {
        id: 'hdl',
        name: 'HDL cholesterol',
        value: 52,
        unit: 'mg/dL',
        range: 'Healthy: 50 or more',
        status: { label: 'Normal', tone: 'success' },
        scaleMin: 20,
        bands: [
          { upTo: 40, tone: 'danger' },
          { upTo: 50, tone: 'warning' },
          { upTo: 100, tone: 'success' },
        ],
      },
      {
        id: 'triglycerides',
        name: 'Triglycerides',
        value: 148,
        unit: 'mg/dL',
        range: 'Normal: under 150',
        status: { label: 'Normal', tone: 'success' },
        scaleMin: 50,
        bands: [
          { upTo: 150, tone: 'success' },
          { upTo: 200, tone: 'warning' },
          { upTo: 300, tone: 'danger' },
        ],
      },
    ],
    explanation:
      'LDL is the cholesterol that builds up in artery walls. Yours is borderline high and 11 points up on last year. With your rising sugar, it is worth reviewing both with a doctor.',
    shareWith: 'Dr Mehta',
  },
};
