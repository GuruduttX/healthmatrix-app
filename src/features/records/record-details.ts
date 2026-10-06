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

/** A report's values, for when lab and pod reports join the timeline (see `value-row.tsx`). */
export type RecordDetail = {
  title: string;
  /** Where the values were measured, shown after the date. */
  source: string;
  values: RecordValue[];
  explanation: string;
  shareWith: string;
};
