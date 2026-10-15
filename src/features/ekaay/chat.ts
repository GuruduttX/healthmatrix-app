import { type Href } from 'expo-router';

import { type TrendPoint } from '@/components/ui/trend-chart';

export type ChatMessage = {
  id: string;
  from: 'user' | 'ekaay';
  text: string;
  chart?: { caption: string; description: string; normalMax: number; points: TrendPoint[] };
  /** Suggested next steps. Those without an `href` have no flow yet. */
  actions?: { label: string; href?: Href }[];
  /** Ekaay is still answering: shown as a quiet "reading your records" line. */
  pending?: boolean;
  /** Not an answer (the greeting, or why one failed), so it isn't sent back as chat history. */
  local?: boolean;
};

export const greeting: ChatMessage = {
  id: 'greeting',
  from: 'ekaay',
  text: 'Hi, I’m Ekaay. Ask me anything about your reports, readings, medicines, vaccines or consults, and I’ll answer from your own records.',
  local: true,
};

export const suggestedQuestions = [
  'Explain my last report',
  'Is my blood pressure okay?',
  'What is due this month?',
];
