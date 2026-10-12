import { isRunningInExpoGo } from 'expo';
import type * as NotificationsApi from 'expo-notifications';
import { Linking, Platform } from 'react-native';

import { type VaccinationRecord } from '@/features/vaccines/types';

import { addDays, describeDose, doseTime, upcomingDoses, type Dose } from './schedule';
import { type MedicineReminder } from './types';

/**
 * Notifications are phone-only; on web the reminders still show in the app. Android's Expo Go
 * dropped expo-notifications in SDK 53 and throws as soon as the module loads, so there they are
 * off too; a development build has them.
 */
export const notificationsSupported =
  Platform.OS !== 'web' && !(Platform.OS === 'android' && isRunningInExpoGo());

/**
 * expo-notifications, loaded only where it works. Everything that reaches it checks
 * `notificationsSupported` first.
 */
export const Notifications: typeof NotificationsApi = notificationsSupported
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('expo-notifications')
  : ({} as typeof NotificationsApi);

const CHANNEL_ID = 'medicine-reminders';
/** Every notification the app schedules starts with one of these, so it clears only its own. */
const ID_PREFIX = 'medicine:';
const VACCINE_PREFIX = 'vaccine:';
/** Of the slots below, vaccine doses may take at most this many; medicines get the rest. */
const MAX_VACCINE = 20;
/** iOS keeps at most 64 pending notifications per app; leave room for others. */
const MAX_SCHEDULED = 60;
/** How far ahead to schedule. Opening the app tops the queue up again. */
const HORIZON_DAYS = 30;

/** Where a tapped reminder notification opens. */
export const REMINDERS_ROUTE = '/care/medicines';

/** Show reminders as a banner even while the app is open. Call once at start-up. */
export function configureNotifications() {
  if (!notificationsSupported) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/** Android 8+ needs a channel before anything shows; Android 13 asks permission only after. */
async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Medicine reminders',
    description: 'Reminds you when a medicine is due',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

export type PermissionState = 'granted' | 'undetermined' | 'denied' | 'unsupported';

export async function getPermission(): Promise<PermissionState> {
  if (!notificationsSupported) return 'unsupported';
  const { status, canAskAgain } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return 'granted';
  return status === 'undetermined' || canAskAgain ? 'undetermined' : 'denied';
}

/**
 * Asks for permission, or opens the phone's settings when the member said no before and the
 * system will not ask again. Returns the state afterwards.
 */
export async function requestPermission(): Promise<PermissionState> {
  const current = await getPermission();
  if (current === 'granted' || current === 'unsupported') return current;
  if (current === 'denied') {
    await Linking.openSettings();
    return current;
  }
  await ensureChannel();
  await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  return getPermission();
}

function contentFor(doses: Dose[]): NotificationsApi.NotificationContentInput {
  const [first] = doses;
  const names = doses.map((dose) => dose.reminder.name);
  const single = doses.length === 1 && first;
  return {
    title: single ? `Time for ${first.reminder.name}` : `Time for ${doses.length} medicines`,
    body: single ? describeDose(first.reminder) || 'Tap to mark it taken' : names.join(', '),
    sound: 'default',
    data: { url: REMINDERS_ROUTE, date: first?.date, time: first?.time },
  };
}

async function cancelOwn() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter(
        (request) =>
          request.identifier.startsWith(ID_PREFIX) || request.identifier.startsWith(VACCINE_PREFIX),
      )
      .map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier)),
  );
}

const vaccineTitle = (name: string) => (/vaccin/i.test(name) ? name : `${name} vaccine`);

/**
 * Two nudges for every vaccine dose not yet given: 7 PM the evening before and 9 AM on the day.
 * Due days are India-time dates, used here as the phone's local days.
 */
function vaccineMoments(vaccinations: VaccinationRecord[], now: Date) {
  const moments: { id: string; at: Date; content: NotificationsApi.NotificationContentInput }[] = [];
  for (const vaccination of vaccinations) {
    const title = vaccineTitle(vaccination.name);
    const where = [vaccination.doseText, vaccination.site?.toLowerCase()]
      .filter(Boolean)
      .join(', ');
    for (const dose of vaccination.doses) {
      if (dose.status === 'given') continue;
      const which =
        vaccination.totalDoses > 1
          ? `Dose ${dose.number} of ${vaccination.totalDoses}`
          : 'Your dose';
      const data = { url: `/care/vaccine/${vaccination.id}` };
      moments.push(
        {
          id: `${VACCINE_PREFIX}${vaccination.id}:${dose.number}:eve`,
          at: doseTime(addDays(dose.dueOn, -1), '19:00'),
          content: {
            title: `Vaccine tomorrow: ${title}`,
            body: `${which} is due tomorrow${where ? ` (${where})` : ''}.`,
            sound: 'default',
            data,
          },
        },
        {
          id: `${VACCINE_PREFIX}${vaccination.id}:${dose.number}:day`,
          at: doseTime(dose.dueOn, '09:00'),
          content: {
            title: `${title} due today`,
            body: `${which}. Mark it given in HealthMatrix once you've had it.`,
            sound: 'default',
            data,
          },
        },
      );
    }
  }
  return moments
    .filter((moment) => moment.at > now)
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .slice(0, MAX_VACCINE);
}

async function sync({ reminders, vaccinations }: Sources) {
  await cancelOwn();
  if ((await getPermission()) !== 'granted') return;
  await ensureChannel();

  const now = new Date();
  const vaccines = vaccineMoments(vaccinations, now);
  for (const moment of vaccines) {
    await Notifications.scheduleNotificationAsync({
      identifier: moment.id,
      content: moment.content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: moment.at,
        channelId: CHANNEL_ID,
      },
    });
  }

  // One notification per moment: medicines due at the same time share it.
  const budget = MAX_SCHEDULED - vaccines.length;
  const groups = new Map<string, Dose[]>();
  for (const dose of upcomingDoses(reminders, now, budget * 4, HORIZON_DAYS)) {
    const key = `${dose.date}T${dose.time}`;
    if (!groups.has(key) && groups.size >= budget) break;
    groups.set(key, [...(groups.get(key) ?? []), dose]);
  }

  for (const [key, doses] of groups) {
    await Notifications.scheduleNotificationAsync({
      identifier: `${ID_PREFIX}${key}`,
      content: contentFor(doses),
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: doses[0]!.at,
        channelId: CHANNEL_ID,
      },
    });
  }
}

type Sources = { reminders: MedicineReminder[]; vaccinations: VaccinationRecord[] };

/** The last list seen of each kind; a sync always schedules from both. */
let latest: Sources = { reminders: [], vaccinations: [] };
/** Runs one sync at a time; a newer request replaces any still waiting. */
let running: Promise<void> | null = null;
let pending: Sources | null = null;

/**
 * Replaces the app's scheduled notifications with the next medicine doses and vaccine doses.
 * Pass whichever list changed; the other keeps its last value. Doses already marked (taken,
 * skipped or given) are left out.
 */
export function syncNotifications(changed: Partial<Sources>) {
  if (!notificationsSupported) return Promise.resolve();
  latest = { ...latest, ...changed };
  pending = latest;
  running ??= (async () => {
    try {
      while (pending) {
        const next = pending;
        pending = null;
        await sync(next).catch((error: unknown) => console.warn('[reminders] sync failed', error));
      }
    } finally {
      running = null;
    }
  })();
  return running;
}

/** Clears every reminder notification, e.g. on sign-out. */
export function clearNotifications() {
  return syncNotifications({ reminders: [], vaccinations: [] });
}
