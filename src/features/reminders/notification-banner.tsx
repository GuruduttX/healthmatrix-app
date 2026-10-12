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
      <View style={styles.icon}>
        <Icon size={18} color={Colors.warning} strokeWidth={2.3} />
      </View>
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
    gap: Spacing.three - 4,
    padding: 14,
    borderRadius: Radius.xl - 4,
    borderWidth: 1,
    borderColor: 'rgba(181, 120, 10, 0.18)',
    backgroundColor: Colors.warningSoft,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundElement,
  },
  text: {
    flex: 1,
  },
  button: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: Radius.pill,
    backgroundColor: Colors.ink,
  },
  pressed: {
    opacity: 0.8,
  },
});
