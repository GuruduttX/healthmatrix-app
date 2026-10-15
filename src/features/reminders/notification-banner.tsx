import { BellOff, BellRing } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { AppState, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Glass } from '@/components/ui/glass';
import { IconTile } from '@/components/ui/icon-tile';
import { LIST_LEAD } from '@/components/ui/list';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

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

  return (
    // A pane of glass like the rest of the page; the watch-tinted dish says it needs a look.
    <Glass style={styles.card}>
      <IconTile icon={denied ? BellOff : BellRing} tone="warning" size={LIST_LEAD} />
      <View style={styles.text}>
        <ThemedText style={styles.title}>
          {denied ? 'Notifications are off' : 'Get reminded on time'}
        </ThemedText>
        <ThemedText style={styles.body}>
          {denied
            ? 'Turn them on in Settings, or your medicine reminders will not ring.'
            : 'Allow notifications so your phone alerts you when a dose is due.'}
        </ThemedText>
      </View>
      <Pressable
        onPress={request}
        accessibilityRole="button"
        hitSlop={8}
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
        <ThemedText style={styles.buttonText}>{denied ? 'Settings' : 'Allow'}</ThemedText>
      </Pressable>
    </Glass>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
    paddingVertical: Spacing.three - 2,
    paddingHorizontal: Spacing.three - 2,
  },
  text: {
    flex: 1,
    gap: 1,
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: 14.5,
    lineHeight: 19,
    color: Colors.text,
  },
  body: {
    fontFamily: Fonts.medium,
    fontSize: 12.5,
    lineHeight: 17,
    color: Colors.textSoft,
  },
  // Home's small action pill: solid, since turning reminders on is the thing to do now.
  button: {
    justifyContent: 'center',
    height: 32,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primaryDeep,
  },
  buttonPressed: {
    backgroundColor: Colors.primaryInk,
    transform: [{ scale: 0.97 }],
  },
  buttonText: {
    fontFamily: Fonts.bold,
    fontSize: 13.5,
    lineHeight: 18,
    color: Colors.onInk,
  },
});
