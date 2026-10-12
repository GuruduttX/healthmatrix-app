import { type Href } from 'expo-router';
import {
  CalendarClock,
  CalendarX,
  Clock,
  Pill,
  Syringe,
  Video,
  type LucideIcon,
} from 'lucide-react-native';

import { type Tone } from '@/components/ui/icon-tile';
import { JOIN_OPENS_MS } from '@/features/consult-call/consult-call-api';
import { specialtyLabel } from '@/features/doctors/specialties';
import { formatSlot, istParts, istToday } from '@/features/doctors/time';
import { useAppointments } from '@/features/doctors/use-appointments';
import { useConsultRequests } from '@/features/doctors/use-consult-requests';
import { doseState } from '@/features/reminders/dose-item';
import {
  addDays,
  describeDose,
  dosesOn,
  formatTime,
  toDateKey,
} from '@/features/reminders/schedule';
import { useNow } from '@/features/reminders/use-now';
import { useReminders } from '@/features/reminders/use-reminders';
import { useVaccinations } from '@/features/vaccines/use-vaccinations';

export type Notice = {
  id: string;
  /** Something to do now: a dose due, a consult starting, a doctor's cancellation. */
  urgent: boolean;
  title: string;
  body: string;
  /** When it is for, in words: "Today, 5:30 PM", "6:30 AM". */
  when?: string;
  icon: LucideIcon;
  tone: Tone;
  href: Href;
};

const vaccineTitle = (name: string) => (/vaccin/i.test(name) ? name : `${name} vaccine`);

/**
 * What the member should know about right now, worked out from the consults, custom-time
 * requests, medicines and vaccines the app already holds. Nothing is stored or sent: it changes
 * as they do. `notices` is null until consults and medicines have loaded.
 */
export function useNotifications() {
  const { appointments, refresh: refreshAppointments } = useAppointments();
  const { requests, refresh: refreshRequests } = useConsultRequests();
  const { reminders, refresh: refreshReminders } = useReminders();
  const { vaccinations, refresh: refreshVaccinations } = useVaccinations();
  const now = useNow();

  const refresh = () =>
    Promise.allSettled([
      refreshAppointments(),
      refreshRequests(),
      refreshReminders(),
      refreshVaccinations(),
    ]);

  if (!appointments || !reminders) return { notices: null, refresh };

  const notices: Notice[] = [];
  const today = istToday(now);
  const tomorrow = addDays(today, 1);

  for (const consult of appointments) {
    const doctor = consult.doctor?.name ?? 'Your doctor';
    const href: Href = { pathname: '/consult/[id]', params: { id: consult.id } };
    const untilStart = new Date(consult.scheduledAt).getTime() - now.getTime();
    const day = istParts(consult.scheduledAt).date;

    if (consult.status === 'in_progress') {
      notices.push({
        id: `consult-${consult.id}`,
        urgent: true,
        title: `${doctor} is ready for you`,
        body: 'Your video consult has started. Join now.',
        icon: Video,
        tone: 'success',
        href,
      });
    } else if (consult.status === 'cancelled') {
      notices.push({
        id: `consult-${consult.id}`,
        urgent: true,
        title: `${doctor} cancelled your consult`,
        body: consult.cancelReason ?? 'Pick another slot with them, or another doctor.',
        when: formatSlot(consult.scheduledAt, now),
        icon: CalendarX,
        tone: 'danger',
        href: '/care',
      });
    } else if (consult.status === 'scheduled' && untilStart <= JOIN_OPENS_MS) {
      notices.push({
        id: `consult-${consult.id}`,
        urgent: true,
        title: 'Your waiting room is open',
        body: `Video consult with ${doctor}. Join when you’re ready.`,
        when: formatSlot(consult.scheduledAt, now),
        icon: Video,
        tone: 'success',
        href,
      });
    } else if (consult.status === 'scheduled' && (day === today || day === tomorrow)) {
      notices.push({
        id: `consult-${consult.id}`,
        urgent: false,
        title: `Consult ${day === today ? 'today' : 'tomorrow'} with ${doctor}`,
        body: `${specialtyLabel(consult.specialty)} · Video consult`,
        when: formatSlot(consult.scheduledAt, now),
        icon: CalendarClock,
        tone: 'primary',
        href: '/care',
      });
    }
  }

  for (const request of requests ?? []) {
    const doctor = request.doctor?.name ?? 'The doctor';
    if (request.status === 'declined') {
      notices.push({
        id: `request-${request.id}`,
        urgent: true,
        title: `${doctor} can’t do your requested time`,
        body: request.declineReason ?? 'Pick one of their open slots instead.',
        when: formatSlot(request.requestedAt, now),
        icon: CalendarX,
        tone: 'danger',
        href: '/care',
      });
    } else if (request.status === 'expired') {
      notices.push({
        id: `request-${request.id}`,
        urgent: false,
        title: `No reply from ${doctor}`,
        body: 'They didn’t answer before the time you asked for. Book an open slot.',
        when: formatSlot(request.requestedAt, now),
        icon: Clock,
        tone: 'neutral',
        href: '/care',
      });
    } else {
      notices.push({
        id: `request-${request.id}`,
        urgent: false,
        title: `Waiting for ${doctor} to confirm`,
        body: 'Your request for a custom time. Nothing is booked until they confirm.',
        when: formatSlot(request.requestedAt, now),
        icon: Clock,
        tone: 'warning',
        href: '/care',
      });
    }
  }

  const localToday = toDateKey(now);
  for (const dose of dosesOn(reminders, localToday)) {
    const state = doseState(dose, now, localToday);
    if (state !== 'due' && state !== 'missed') continue;
    const detail = describeDose(dose.reminder);
    notices.push({
      id: `dose-${dose.reminder.id}-${dose.time}`,
      urgent: state === 'due',
      title: state === 'due' ? `Time for ${dose.reminder.name}` : `${dose.reminder.name} not marked`,
      body:
        state === 'due'
          ? detail || 'Tick it off once you’ve taken it.'
          : `Was due at ${formatTime(dose.time)}. Mark it taken or skipped.`,
      when: formatTime(dose.time),
      icon: Pill,
      tone: state === 'due' ? 'primary' : 'warning',
      href: '/care/medicines',
    });
  }

  for (const vaccination of vaccinations ?? []) {
    const dose = vaccination.doses.find((d) => d.status !== 'given');
    if (!dose || (dose.status !== 'due' && dose.status !== 'overdue')) continue;
    notices.push({
      id: `vaccine-${vaccination.id}`,
      urgent: true,
      title: `${vaccineTitle(vaccination.name)}: dose ${dose.number} ${dose.status === 'overdue' ? 'is overdue' : 'is due'}`,
      body: 'Get it at a clinic or hospital, then mark it given.',
      icon: Syringe,
      tone: dose.status === 'overdue' ? 'danger' : 'primary',
      href: { pathname: '/care/vaccine/[id]', params: { id: vaccination.id } },
    });
  }

  return { notices, refresh };
}
