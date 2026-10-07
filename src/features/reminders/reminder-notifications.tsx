import * as Notifications from 'expo-notifications';
import { router, type Href } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/features/auth/auth-context';

import { refreshVaccinations, useVaccinations } from '@/features/vaccines/use-vaccinations';

import {
  clearNotifications,
  configureNotifications,
  notificationsSupported,
  syncNotifications,
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
 * Keeps the phone's scheduled notifications (medicine doses and vaccine doses) in step with
 * the saved ones while signed in, clears them on sign-out, and opens the right screen when one
 * is tapped. Renders nothing.
 * Mount it once auth has loaded, or start-up would clear the queue before the member is known.
 */
export function ReminderNotifications() {
  const { member } = useAuth();
  const memberId = member?.id;

  return memberId ? <SignedIn memberId={memberId} /> : <SignedOut />;
}

function SignedOut() {
  useEffect(() => {
    void clearNotifications();
  }, []);
  return null;
}

function SignedIn({ memberId }: { memberId: string }) {
  const { reminders } = useReminders();
  const { vaccinations } = useVaccinations();

  useEffect(() => {
    if (reminders) void syncNotifications({ reminders });
  }, [reminders]);

  useEffect(() => {
    if (vaccinations) void syncNotifications({ vaccinations });
  }, [vaccinations]);

  // Coming back to the app tops up the queue (it only reaches a few weeks ahead) and picks up
  // changes made on another device.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      refreshReminders(memberId).catch(() => undefined);
      refreshVaccinations(memberId).catch(() => undefined);
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
