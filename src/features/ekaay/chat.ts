import { type Href } from 'expo-router';

import { type TrendPoint } from '@/components/ui/trend-chart';

export type ChatMessage = {
  id: string;
  from: 'user' | 'ekaay';
  text: string;
  chart?: { caption: string; description: string; normalMax: number; points: TrendPoint[] };
  /** Suggested next steps. Those without an `href` have no flow yet. */
  actions?: { label: string; href?: Href }[];
};

/**
 * SAMPLE CONVERSATION from the brochure mock-up, so the chat can be designed
 * before Ekaay is connected. Replace with the Ekaay API.
 */
export const sampleConversation: ChatMessage[] = [
  {
    id: 'm1',
    from: 'user',
    text: 'My fasting sugar was 118 at the pod last week. Should I worry?',
  },
  {
    id: 'm2',
    from: 'ekaay',
    text: 'It\u2019s worth acting on, not worrying about. 118 mg/dL is above the normal fasting range (70 to 99) and inside the prediabetes range (100 to 125).',
    chart: {
      caption: 'Your fasting sugar, mg/dL',
      description: 'Fasting sugar in mg/dL',
      normalMax: 99,
      points: [
        { label: 'Aug 2024', value: 96 },
        { label: 'Mar 2026', value: 104 },
        { label: 'Sep 2026', value: 118 },
      ],
    },
  },
  {
    id: 'm3',
    from: 'ekaay',
    text: 'One reading isn\u2019t a diagnosis. An HbA1c test shows your three-month average, and it doesn\u2019t need fasting. Shall I book one and share it with Dr Mehta?',
    actions: [{ label: 'Book HbA1c', href: '/care' }, { label: 'Share with Dr Mehta' }],
  },
  { id: 'm4', from: 'user', text: 'Yes, Saturday morning please.' },
  {
    id: 'm5',
    from: 'ekaay',
    text: 'Booked for Saturday, 8:30 am at the Sector 1 clubhouse pod. I\u2019ll explain the result as soon as it arrives.',
  },
];

export const suggestedQuestions = [
  'Explain my last report',
  'Is my blood pressure okay?',
  'What is due this month?',
];

/** Shown in place of a real answer until the Ekaay API exists. */
export const notConnectedReply =
  'I\u2019m not connected to your records in this build yet, so I can\u2019t answer that. Once Ekaay is live, I\u2019ll answer from your own reports.';
