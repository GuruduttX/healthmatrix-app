import { Bell } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Shadows, Spacing } from '@/constants/theme';
import { MemberAvatar } from '@/features/profile/member-avatar';

function greeting(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

type HomeHeaderProps = {
  name: string;
  photoUrl?: string;
  hasUnread: boolean;
  onPressProfile?: () => void;
  onPressNotifications?: () => void;
};

export function HomeHeader({
  name,
  photoUrl,
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
        accessibilityLabel="Open your profile"
        hitSlop={4}
        style={({ pressed }) => pressed && styles.pressed}>
        <MemberAvatar name={name} photoUrl={photoUrl} size={48} />
      </Pressable>

      <View style={styles.text}>
        <ThemedText type="small" themeColor="textSecondary">
          {greeting(new Date().getHours())}
        </ThemedText>
        <ThemedText type="subtitle" numberOfLines={1} style={styles.name}>
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
  text: {
    flex: 1,
  },
  name: {
    fontFamily: Fonts.display,
    fontSize: 24,
    lineHeight: 30,
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
