import { BellOff, BellRing } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { AppState, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing } from '@/constants/theme';

import { getPermission, requestPermission, type PermissionState } from './notifications';

/** The notification permission, checked again whenever the app comes back to the front. */
export function useNotificationPermission() {
  const [state, setState] = useState<PermissionState | null>(null);

  useEffect(() => {
    let active = true;
    const check = () =>
      getPermission().then((next) => {
        if (active) setState(next);
      });
    check();
    // The member may have switched them on in Settings and come back.
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') check();
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  const request = async () => {
    const next = await requestPermission();
    setState(next);
    return next;
  };

  return { state, request };
}

/** Asks for notifications when they are off. Hidden once they are on, and on web. */
export function NotificationBanner() {
  const { state, request } = useNotificationPermission();
  if (state !== 'undetermined' && state !== 'denied') return null;

  const denied = state === 'denied';
  const Icon = denied ? BellOff : BellRing;

  return (
    <View style={styles.banner}>
      <Icon size={20} color={Colors.warning} strokeWidth={2.2} />
      <View style={styles.text}>
        <ThemedText type="smallBold">
          {denied ? 'Notifications are off' : 'Get reminded on time'}
        </ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          {denied
            ? 'Turn them on in Settings, or your medicine reminders will not ring.'
            : 'Allow notifications so your phone alerts you when a dose is due.'}
        </ThemedText>
      </View>
      <Pressable
        onPress={request}
        accessibilityRole="button"
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
        <ThemedText type="smallBold" themeColor="onInk">
          {denied ? 'Settings' : 'Allow'}
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 4,
    padding: 14,
    borderRadius: Radius.lg,
    backgroundColor: Colors.warningSoft,
  },
  text: {
    flex: 1,
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: Radius.md,
    backgroundColor: Colors.ink,
  },
  pressed: {
    opacity: 0.8,
  },
});
