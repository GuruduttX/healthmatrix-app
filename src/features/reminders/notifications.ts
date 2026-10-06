import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';

import { describeDose, upcomingDoses, type Dose } from './schedule';
import { type MedicineReminder } from './types';

/** Notifications are phone-only; on web the reminders still show in the app. */
export const notificationsSupported = Platform.OS !== 'web';

const CHANNEL_ID = 'medicine-reminders';
/** Every notification this feature schedules starts with this, so it can clear only its own. */
const ID_PREFIX = 'medicine:';
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

function contentFor(doses: Dose[]): Notifications.NotificationContentInput {
  const [first] = doses;
  const names = doses.map((dose) => dose.reminder.name);
  const single = doses.length === 1 && first;
  return {
    title: single ? `Time for ${first.reminder.name}` : `Time for ${doses.length} medicines`,
    body: single
      ? describeDose(first.reminder) || 'Tap to mark it taken'
      : names.join(', '),
    sound: 'default',
    data: { url: REMINDERS_ROUTE, date: first?.date, time: first?.time },
  };
}

async function cancelOwn() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((request) => request.identifier.startsWith(ID_PREFIX))
      .map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier)),
  );
}

async function sync(reminders: MedicineReminder[]) {
  await cancelOwn();
  if ((await getPermission()) !== 'granted') return;
  await ensureChannel();

  // One notification per moment: medicines due at the same time share it.
  const groups = new Map<string, Dose[]>();
  for (const dose of upcomingDoses(reminders, new Date(), MAX_SCHEDULED * 4, HORIZON_DAYS)) {
    const key = `${dose.date}T${dose.time}`;
    if (!groups.has(key) && groups.size >= MAX_SCHEDULED) break;
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

/** Runs one sync at a time; a newer request replaces any still waiting. */
let running: Promise<void> | null = null;
let pending: MedicineReminder[] | null = null;

/**
 * Replaces this feature's scheduled notifications with the next doses of `reminders`. Doses
 * already marked taken or skipped are left out. Pass `[]` to clear them, e.g. on sign-out.
 */
export function syncMedicineNotifications(reminders: MedicineReminder[]) {
  if (!notificationsSupported) return Promise.resolve();
  pending = reminders;
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
