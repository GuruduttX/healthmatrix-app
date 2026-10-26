import {
  CircleHelp,
  CreditCard,
  FileText,
  FlaskConical,
  Pill,
  Smartphone,
  Stethoscope,
  UserRound,
  type LucideIcon,
} from 'lucide-react-native';

import { type SupportTopic } from './types';

type TopicInfo = {
  label: string;
  icon: LucideIcon;
  /** Ways to start, tapped into the message box once the topic is picked. */
  starters: string[];
};

/** The topics a member picks from when starting a chat, in the order they show. */
export const SUPPORT_TOPICS: Record<SupportTopic, TopicInfo> = {
  consults: {
    label: 'Doctor consults',
    icon: Stethoscope,
    starters: [
      'I need to change the time of my consult',
      'My video call didn’t connect',
      'I haven’t received my prescription',
    ],
  },
  pods: {
    label: 'Pod tests',
    icon: FlaskConical,
    starters: [
      'My pod results aren’t showing',
      'I want to move my booking to another pod',
      'A test is missing from my report',
    ],
  },
  records: {
    label: 'Health records',
    icon: FileText,
    starters: ['I can’t find a report I added', 'A record has the wrong details'],
  },
  medicines: {
    label: 'Medicines',
    icon: Pill,
    starters: [
      'My medicine reminders aren’t coming',
      'I want to change when I take a medicine',
    ],
  },
  account: {
    label: 'My account',
    icon: UserRound,
    starters: [
      'I can’t sign in on my new phone',
      'I want to change my phone number',
      'I need help adding a family member',
    ],
  },
  billing: {
    label: 'Plans & payments',
    icon: CreditCard,
    starters: ['I was charged twice', 'I want to change my plan', 'I need an invoice'],
  },
  app: {
    label: 'App problem',
    icon: Smartphone,
    starters: [
      'The app closes on its own',
      'I’m not getting notifications',
      'A screen won’t load',
    ],
  },
  other: {
    label: 'Something else',
    icon: CircleHelp,
    starters: ['I have a suggestion for HealthMatrix', 'I need help with something else'],
  },
};

export const TOPIC_ORDER = Object.keys(SUPPORT_TOPICS) as SupportTopic[];
