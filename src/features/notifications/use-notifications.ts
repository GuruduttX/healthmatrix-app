import { type Href } from 'expo-router';
import { useCallback, useEffect, useSyncExternalStore } from 'react';
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
import { useAuth } from '@/features/auth/auth-context';
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
import { storage } from '@/services/storage';

export type Notice = {
  /**
   * Names this exact message: the thing it's about and the stage it's at ("consult-…-open",
   * "dose-…-2026-10-14-08:00-due"). Clearing hides that message only, so a later stage (the
   * waiting room opening) or tomorrow's dose still shows.
   */
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

// Notifications the member cleared, kept on this phone per account. Only the ones still showing
// when they last cleared are kept: a message that's gone never comes back with the same id.
let cleared: { memberId: string; ids: Set<string> } | null = null;
const listeners = new Set<() => void>();
const clearedKey = (memberId: string) => `healthmatrix.clearedNotices.${memberId}`;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function publish(memberId: string, ids: Set<string>) {
  cleared = { memberId, ids };
  listeners.forEach((listener) => listener());
}

async function loadCleared(memberId: string) {
  if (cleared?.memberId === memberId) return;
  const saved = await storage.get(clearedKey(memberId)).catch(() => null);
  let ids: string[] = [];
  try {
    ids = saved ? (JSON.parse(saved) as string[]) : [];
  } catch {
    // A broken copy: start over.
  }
  publish(memberId, new Set(ids));
}

/**
 * What the member should know about right now, worked out from the consults, custom-time
 * requests, medicines and vaccines the app already holds. Nothing is sent: it changes as they do.
 * Only which ones the member cleared is kept, on the phone. `notices` is null until consults and
 * medicines have loaded.
 */
export function useNotifications() {
  const memberId = useAuth().member?.id;
  const current = useSyncExternalStore(subscribe, () => cleared);
  const hidden = current && current.memberId === memberId ? current.ids : null;
  const { appointments, refresh: refreshAppointments } = useAppointments();
  const { requests, refresh: refreshRequests } = useConsultRequests();
  const { reminders, refresh: refreshReminders } = useReminders();
  const { vaccinations, refresh: refreshVaccinations } = useVaccinations();
  const now = useNow();

  useEffect(() => {
    if (memberId) void loadCleared(memberId);
  }, [memberId]);

  const refresh = () =>
    Promise.allSettled([
      refreshAppointments(),
      refreshRequests(),
      refreshReminders(),
      refreshVaccinations(),
    ]);

  /** Hides every notification showing now. New ones, and later stages of these, still show. */
  const clearAll = useCallback(
    async (ids: string[]) => {
      if (!memberId) return;
      publish(memberId, new Set(ids));
      await storage.set(clearedKey(memberId), JSON.stringify(ids)).catch(() => undefined);
    },
    [memberId],
  );

  if (!appointments || !reminders) return { notices: null, refresh, clear: async () => {} };

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
        id: `consult-${consult.id}-live`,
        urgent: true,
        title: `${doctor} is ready for you`,
        body: 'Your video consult has started. Join now.',
        icon: Video,
        tone: 'success',
        href,
      });
    } else if (consult.status === 'cancelled') {
      notices.push({
        id: `consult-${consult.id}-cancelled`,
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
        id: `consult-${consult.id}-open`,
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
        // "Tomorrow" cleared yesterday doesn't hide "today".
        id: `consult-${consult.id}-${today}`,
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
        id: `request-${request.id}-declined`,
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
        id: `request-${request.id}-expired`,
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
        id: `request-${request.id}-pending`,
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
      id: `dose-${dose.reminder.id}-${localToday}-${dose.time}-${state}`,
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
      id: `vaccine-${vaccination.id}-${dose.number}-${dose.status}`,
      urgent: true,
      title: `${vaccineTitle(vaccination.name)}: dose ${dose.number} ${dose.status === 'overdue' ? 'is overdue' : 'is due'}`,
      body: 'Get it at a clinic or hospital, then mark it given.',
      icon: Syringe,
      tone: dose.status === 'overdue' ? 'danger' : 'primary',
      href: { pathname: '/care/vaccine/[id]', params: { id: vaccination.id } },
    });
  }

  return {
    /** What shows: everything worked out above but the ones cleared. */
    notices: notices.filter((notice) => !hidden?.has(notice.id)),
    refresh,
    clear: () => clearAll(notices.map((notice) => notice.id)),
  };
}
