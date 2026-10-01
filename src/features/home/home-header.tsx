import { LinearGradient } from 'expo-linear-gradient';
import { Bell } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Shadows, Spacing } from '@/constants/theme';

function greeting(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

type HomeHeaderProps = {
  firstName: string;
  initials: string;
  hasUnread: boolean;
  onPressNotifications?: () => void;
};

export function HomeHeader({ firstName, initials, hasUnread, onPressNotifications }: HomeHeaderProps) {
  return (
    <View style={styles.row}>
      <LinearGradient
        colors={[Colors.primaryMid, Colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.avatar}>
        <ThemedText style={styles.initials}>{initials}</ThemedText>
      </LinearGradient>

      <View style={styles.text}>
        <ThemedText type="small" themeColor="textSecondary">
          {greeting(new Date().getHours())}
        </ThemedText>
        <ThemedText type="subtitle" numberOfLines={1}>
          {firstName}
        </ThemedText>
      </View>

      <Pressable
        onPress={onPressNotifications}
        accessibilityRole="button"
        accessibilityLabel={hasUnread ? 'Notifications, unread' : 'Notifications'}
        style={({ pressed }) => [styles.bell, pressed && styles.pressed]}>
        <Bell size={20} color={Colors.text} strokeWidth={2} />
        {hasUnread ? <View style={styles.unreadDot} /> : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: Colors.onInk,
  },
  text: {
    flex: 1,
  },
  bell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
    boxShadow: Shadows.card,
  },
  pressed: {
    opacity: 0.7,
  },
  unreadDot: {
    position: 'absolute',
    top: 10,
    right: 11,
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: Colors.backgroundElement,
    backgroundColor: Colors.primary,
  },
});
