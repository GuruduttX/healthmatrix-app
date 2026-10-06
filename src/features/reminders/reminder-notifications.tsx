import * as Notifications from 'expo-notifications';
import { router, type Href } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/features/auth/auth-context';

import {
  configureNotifications,
  notificationsSupported,
  syncMedicineNotifications,
} from './notifications';
import { refreshReminders, useReminders } from './use-reminders';

// The handler has to be in place before the first notification arrives.
configureNotifications();

function openFrom(response: Notifications.NotificationResponse | null) {
  const url = response?.notification.request.content.data?.url;
  // With the Care page beneath it, so Back from the medicines screen lands there.
  if (typeof url === 'string') router.push(url as Href, { withAnchor: true });
}

/**
 * Keeps the phone's scheduled reminders in step with the saved ones while signed in, clears
 * them on sign-out, and opens the medicines screen when a reminder is tapped. Renders nothing.
 * Mount it once auth has loaded, or start-up would clear the queue before the member is known.
 */
export function ReminderNotifications() {
  const { member } = useAuth();
  const memberId = member?.id;

  return memberId ? <SignedIn memberId={memberId} /> : <SignedOut />;
}

function SignedOut() {
  useEffect(() => {
    void syncMedicineNotifications([]);
  }, []);
  return null;
}

function SignedIn({ memberId }: { memberId: string }) {
  const { reminders } = useReminders();

  useEffect(() => {
    if (reminders) void syncMedicineNotifications(reminders);
  }, [reminders]);

  // Coming back to the app tops up the queue (it only reaches a few weeks ahead) and picks up
  // changes made on another device.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshReminders(memberId).catch(() => undefined);
    });
    return () => subscription.remove();
  }, [memberId]);

  useEffect(() => {
    if (!notificationsSupported) return;
    // Tapped while the app was closed: handle it once, then forget it.
    const last = Notifications.getLastNotificationResponse();
    if (last) {
      openFrom(last);
      Notifications.clearLastNotificationResponse();
    }
    const subscription = Notifications.addNotificationResponseReceivedListener(openFrom);
    return () => subscription.remove();
  }, []);

  return null;
}
