import { type FaceScan, VITALS } from '@/features/face-scan/vitals';

import { type Reading } from './sample-data';

/** How many past scans the pulse's trend keeps. */
const TREND = 6;

/**
 * Home's vitals with the pulse from the member's face scans: the latest heart rate, flagged
 * against the usual resting range (as the scan's result is), and the recent ones as its trend.
 * Before any scan the pulse shows no number and no flag.
 */
export function withScannedPulse(readings: Reading[], scans: FaceScan[] | null): Reading[] {
  // Newest first, like the scans.
  const rates = (scans ?? []).flatMap((scan) =>
    scan.vitals.filter((vital) => vital.code === 'heart_rate').map((vital) => vital.value),
  );
  const latest = rates[0];
  const { low, high } = VITALS.heart_rate;

  return readings.map((reading) => {
    if (reading.id !== 'pulse') return reading;
    if (latest === undefined) {
      const scale = { ...reading.scale, at: reading.scale.min };
      return { ...reading, value: '–', flag: undefined, trend: [], scale };
    }
    return {
      ...reading,
      label: 'Pulse from your face scan',
      value: String(latest),
      flag: latest < low ? 'low' : latest > high ? 'high' : 'normal',
      trend: rates.slice(0, TREND).reverse(),
      scale: { ...reading.scale, at: latest },
    };
  });
}
