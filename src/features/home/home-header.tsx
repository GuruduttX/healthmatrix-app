import { LinearGradient } from 'expo-linear-gradient';
import { BadgeCheck, Bell, Check } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Radius, Shadows, Spacing } from '@/constants/theme';
import { MemberAvatar } from '@/features/profile/member-avatar';

function greeting(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

type HomeHeaderProps = {
  name: string;
  photoUrl?: string;
  /** "Essential", "Family"; the member's plan, shown as a small badge. */
  planName?: string;
  abhaLinked?: boolean;
  hasUnread: boolean;
  onPressProfile: () => void;
  onPressNotifications: () => void;
};

/** Top of Home on the warm page: who's signed in, their plan, and the bell. */
export function HomeHeader({
  name,
  photoUrl,
  planName,
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
        style={({ pressed }) => [styles.avatarShadow, pressed && styles.pressed]}>
        {/* A thin ring in the brand's sunrise colours, with a white gap around the photo. A plain
            View rounds and clips; the gradient is a layer inside it. */}
        <View style={styles.avatarRing}>
          <LinearGradient
            colors={[Colors.primary, Colors.primaryMid, Colors.primaryLight]}
            locations={[0, 0.45, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.avatarGap}>
            <MemberAvatar name={name} photoUrl={photoUrl} size={AVATAR} />
          </View>
        </View>
        {/* A verified tick: the health ID is linked to ABHA. */}
        {abhaLinked ? (
          <View style={styles.abhaBadge}>
            <Check size={10} color={Colors.onInk} strokeWidth={3.4} />
          </View>
        ) : null}
      </Pressable>

      <View style={styles.flex}>
        {/* The plan sits beside the short greeting, so the name always has its own full line. */}
        <View style={styles.greetingRow}>
          <ThemedText style={styles.greeting} numberOfLines={1}>
            {greeting(new Date().getHours())}
          </ThemedText>
          {planName ? (
            <View style={styles.plan} accessible accessibilityLabel={`${planName} plan`}>
              <BadgeCheck size={12} color={Colors.primaryDeep} strokeWidth={2.4} />
              <ThemedText style={styles.planText} numberOfLines={1}>
                {planName}
              </ThemedText>
            </View>
          ) : null}
        </View>
        <ThemedText style={styles.name} numberOfLines={1}>
          {firstName}
        </ThemedText>
      </View>

      <Pressable
        onPress={onPressNotifications}
        accessibilityRole="button"
        accessibilityLabel={hasUnread ? 'Notifications, something needs you' : 'Notifications'}
        hitSlop={4}
        style={({ pressed }) => [styles.bell, pressed && styles.pressed]}>
        <Bell size={20} color={Colors.text} strokeWidth={2} />
        {hasUnread ? <View style={styles.unreadDot} /> : null}
      </Pressable>
    </View>
  );
}

const AVATAR = 46;
/** White between the photo and the ring. */
const GAP = 2;
/** The ring's own thickness is what's left: 2.5 on each side. */
const RING_SIZE = AVATAR + GAP * 2 + 5;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
  },
  flex: {
    flex: 1,
  },
  avatarShadow: {
    borderRadius: RING_SIZE / 2,
    boxShadow: Shadows.soft,
  },
  avatarRing: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarGap: {
    padding: GAP,
    borderRadius: AVATAR / 2 + GAP,
    backgroundColor: Colors.backgroundElement,
  },
  abhaBadge: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.backgroundElement,
    backgroundColor: Colors.good,
  },
  // On a narrow phone with a long greeting and plan, the plan drops under the greeting rather
  // than cutting either short.
  greetingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: Spacing.two,
    rowGap: 2,
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
  plan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 2,
    paddingLeft: 6,
    paddingRight: 8,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.primaryTintStrong,
    backgroundColor: Colors.primaryTint,
  },
  planText: {
    fontFamily: Fonts.bold,
    fontSize: 11.5,
    lineHeight: 14,
    letterSpacing: 0.2,
    color: Colors.primaryDeep,
  },
  bell: {
    width: 46,
    height: 46,
    borderRadius: 23,
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
