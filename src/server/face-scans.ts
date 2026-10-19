import { type Types } from 'mongoose';
import { z } from 'zod';

import { vitalCodes, type FaceScan, type VitalCode } from '@/features/face-scan/vitals';

import { FaceScanModel } from './models';

/** Values a camera reading could possibly give; anything else is a bug or a forged request. */
const PLAUSIBLE: Record<VitalCode, [number, number]> = {
  heart_rate: [40, 200],
  breathing_rate: [4, 40],
  hrv: [5, 250],
  blood_pressure_systolic: [60, 250],
  blood_pressure_diastolic: [30, 160],
  spo2: [70, 100],
};

export const faceScanInput = z.object({
  measuredAt: z.iso.datetime(),
  seconds: z.number().min(10).max(180),
  quality: z.enum(['good', 'fair']),
  engine: z.string().trim().min(1).max(40),
  platform: z.enum(['ios', 'android', 'web']).optional(),
  vitals: z
    .array(z.object({ code: z.enum(vitalCodes), value: z.number() }))
    .min(1)
    .max(vitalCodes.length)
    .refine(
      (vitals) => vitals.every(({ code, value }) => value >= PLAUSIBLE[code][0] && value <= PLAUSIBLE[code][1]),
      'A vital is outside what a face scan can measure',
    )
    .refine(
      (vitals) => new Set(vitals.map(({ code }) => code)).size === vitals.length,
      'Each vital once',
    ),
});

/** How many past scans the app shows and Ekaay reads. */
const KEEP_SHOWN = 20;

function serialize(scan: {
  _id: Types.ObjectId;
  measuredAt: Date;
  seconds: number;
  quality: string;
  engine: string;
  vitals: { code: string; value: number }[];
}): FaceScan {
  return {
    id: String(scan._id),
    measuredAt: scan.measuredAt.toISOString(),
    seconds: scan.seconds,
    quality: scan.quality as FaceScan['quality'],
    engine: scan.engine,
    vitals: scan.vitals.map(({ code, value }) => ({ code: code as VitalCode, value })),
  };
}

/** The member's face scans, newest first. */
export async function listFaceScans(memberId: Types.ObjectId, limit = KEEP_SHOWN) {
  const scans = await FaceScanModel.find({ member: memberId })
    .sort({ measuredAt: -1 })
    .limit(limit)
    .lean();
  return scans.map(serialize);
}

export async function saveFaceScan(memberId: Types.ObjectId, input: z.infer<typeof faceScanInput>) {
  // A scan from the phone's clock: never later than now.
  const measuredAt = new Date(Math.min(Date.parse(input.measuredAt), Date.now()));
  const scan = await FaceScanModel.create({ ...input, member: memberId, measuredAt });
  return serialize(scan);
}
