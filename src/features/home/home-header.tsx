import { Bell, Check, UserRound } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Shadows, Spacing } from '@/constants/theme';

function greeting(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

type HomeHeaderProps = {
  name: string;
  abhaLinked?: boolean;
  hasUnread: boolean;
  onPressProfile: () => void;
  onPressNotifications: () => void;
};

/**
 * Top of Home on the warm page: the profile button, who's signed in, and the bell. The profile is
 * an icon, not a photo, in a round button that pairs with the bell.
 */
export function HomeHeader({
  name,
  abhaLinked,
  hasUnread,
  onPressProfile,
  onPressNotifications,
}: HomeHeaderProps) {
  const firstName = name.trim().split(/\s+/)[0] ?? '';

  return (
    <View style={styles.row}>
      <Pressable
        onPress={onPressProfile}
        accessibilityRole="button"
        accessibilityLabel={`Open your profile${abhaLinked ? '. ABHA linked' : ''}`}
        hitSlop={4}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
        <UserRound size={21} color={Colors.text} strokeWidth={2} />
        {/* A verified tick: the health ID is linked to ABHA. */}
        {abhaLinked ? (
          <View style={styles.abhaBadge}>
            <Check size={10} color={Colors.onInk} strokeWidth={3.4} />
          </View>
        ) : null}
      </Pressable>

      <View style={styles.flex}>
        <ThemedText style={styles.greeting} numberOfLines={1}>
          {greeting(new Date().getHours())}
        </ThemedText>
        <ThemedText style={styles.name} numberOfLines={1}>
          {firstName}
        </ThemedText>
      </View>

      <Pressable
        onPress={onPressNotifications}
        accessibilityRole="button"
        accessibilityLabel={hasUnread ? 'Notifications, something needs you' : 'Notifications'}
        hitSlop={4}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
        <Bell size={20} color={Colors.text} strokeWidth={2} />
        {hasUnread ? <View style={styles.unreadDot} /> : null}
      </Pressable>
    </View>
  );
}

const BUTTON = 46;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
  },
  flex: {
    flex: 1,
  },
  abhaBadge: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.backgroundElement,
    backgroundColor: Colors.good,
  },
  greeting: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    lineHeight: 19,
    color: Colors.textSoft,
  },
  name: {
    fontFamily: Fonts.displaySemibold,
    fontSize: 27,
    lineHeight: 33,
    letterSpacing: -0.5,
    color: Colors.text,
  },
  // The profile and the bell: white rounds with a hairline, a pair at either end of the row.
  button: {
    width: BUTTON,
    height: BUTTON,
    borderRadius: BUTTON / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.hairline,
    backgroundColor: Colors.backgroundElement,
    boxShadow: Shadows.soft,
  },
  unreadDot: {
    position: 'absolute',
    top: 11,
    right: 12,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: Colors.backgroundElement,
    backgroundColor: Colors.primary,
  },
  pressed: {
    opacity: 0.7,
  },
});
