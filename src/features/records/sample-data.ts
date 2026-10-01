import { type Tone } from '@/components/ui/icon-tile';
import { type RecordType } from '@/types';

export type RecordSource = 'pod' | 'upload' | 'whatsapp' | 'consult';

export type RecordItem = {
  id: string;
  type: RecordType;
  source: RecordSource;
  title: string;
  subtitle: string;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  /** Number of values outside their range. */
  attentionCount?: number;
  tag?: { label: string; tone: Tone };
};

/**
 * SAMPLE DATA from the brochure mock-up. The titles and months are the
 * brochure's; exact days are placeholders where the brochure gives none.
 * Replace with the records API.
 */
export const sampleRecords: RecordItem[] = [
  {
    id: 'pod-2026-09',
    type: 'pod_screening',
    source: 'pod',
    title: 'Pod screening, 22 tests',
    subtitle: 'Arc Max pod, Sector 1 clubhouse',
    date: '2026-09-12',
    attentionCount: 2,
    tag: { label: '2 need attention', tone: 'warning' },
  },
  {
    id: 'rx-2026-09',
    type: 'prescription',
    source: 'consult',
    title: 'Prescription',
    subtitle: 'Dr Anjali Mehta, video consult',
    date: '2026-09-05',
  },
  {
    id: 'lipid-2026-08',
    type: 'lab_report',
    source: 'whatsapp',
    title: 'Lipid profile, city lab',
    subtitle: 'Sent on WhatsApp, read by Ekaay',
    date: '2026-08-03',
    tag: { label: 'Added to your timeline', tone: 'success' },
  },
  {
    id: 'tetanus-2026-08',
    type: 'vaccination',
    source: 'upload',
    title: 'Tetanus booster',
    subtitle: 'Vaccination record',
    date: '2026-08-01',
  },
  {
    id: 'annual-2026-03',
    type: 'lab_report',
    source: 'upload',
    title: 'Annual health check',
    subtitle: 'Lab PDF, 18 pages',
    date: '2026-03-14',
  },
];
