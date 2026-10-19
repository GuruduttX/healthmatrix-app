import { analyse, type Sample } from './dsp';

/**
 * What a face scan can report. The phone's own rPPG measures the first three; the rest are
 * here for a licensed vitals SDK, which would add them through another `VitalsEngine` without
 * changing the screens, the API or the database.
 */
export const VITALS = {
  heart_rate: { name: 'Heart rate', unit: 'bpm', low: 60, high: 100 },
  breathing_rate: { name: 'Breathing rate', unit: 'breaths/min', low: 12, high: 20 },
  /** RMSSD. Healthy values vary a lot with age and fitness, so it has no normal range. */
  hrv: { name: 'Heart rate variability', unit: 'ms', low: undefined, high: undefined },
  blood_pressure_systolic: { name: 'Blood pressure (upper)', unit: 'mmHg', low: 90, high: 120 },
  blood_pressure_diastolic: { name: 'Blood pressure (lower)', unit: 'mmHg', low: 60, high: 80 },
  spo2: { name: 'Oxygen level (SpO₂)', unit: '%', low: 95, high: 100 },
} as const;

export type VitalCode = keyof typeof VITALS;
export const vitalCodes = Object.keys(VITALS) as [VitalCode, ...VitalCode[]];

export type Vital = { code: VitalCode; value: number };

export type FaceScan = {
  id?: string;
  /** ISO time. */
  measuredAt: string;
  seconds: number;
  quality: 'good' | 'fair';
  /** What measured it, e.g. "rppg-pos"; a licensed SDK would name itself. */
  engine: string;
  vitals: Vital[];
};

/** Within the usual resting range, or outside it ("watch"); none for vitals without a range. */
export function vitalFlag({ code, value }: Vital): 'normal' | 'watch' | undefined {
  const { low, high } = VITALS[code];
  if (low === undefined || high === undefined) return undefined;
  return value < low || value > high ? 'watch' : 'normal';
}

/** A face scan's measuring engine: the phone's rPPG today, a licensed SDK later. */
export type VitalsEngine = {
  id: string;
  /** The vitals this engine can measure, shown before the scan. */
  measures: VitalCode[];
  analyse(samples: Sample[]): FaceScan | { why: 'short' | 'noisy' };
};

/** Remote photoplethysmography on the phone (see `dsp.ts`). */
export const rppgEngine: VitalsEngine = {
  id: 'rppg-pos',
  measures: ['heart_rate', 'breathing_rate', 'hrv'],
  analyse(samples) {
    const result = analyse(samples);
    if (!result.ok) return { why: result.why };
    const vitals: Vital[] = [{ code: 'heart_rate', value: result.heartRate }];
    if (result.breathingRate) vitals.push({ code: 'breathing_rate', value: result.breathingRate });
    if (result.hrv) vitals.push({ code: 'hrv', value: result.hrv });
    return {
      measuredAt: new Date().toISOString(),
      seconds: Math.round(result.seconds),
      quality: result.quality,
      engine: this.id,
      vitals,
    };
  },
};
