import { Bell, Check } from 'lucide-react-native';
import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, Path, Stop, LinearGradient } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Glass } from '@/components/ui/glass';
import { Colors, Fonts, Spacing } from '@/constants/theme';

function greeting(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const BUTTON = 46;
const MID = BUTTON / 2;
/** The frosted disc inside the ring, with a white gap between them. */
const DISC = MID - 4;

/**
 * The profile button's face: a frosted disc inside a thin ring that runs from sky blue to peach.
 * `glyph` draws inside the disc, clipped to it, given the soft blue fill.
 */
function Medallion({ id, glyph }: { id: string; glyph: (fill: string) => ReactNode }) {
  return (
    <Svg width={BUTTON} height={BUTTON}>
      <Defs>
        {/* Blue and peach meet through pale tints, so they never mix to grey. */}
        <LinearGradient id={`${id}-ring`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#86BEEA" />
          <Stop offset="0.45" stopColor="#D8E9F7" />
          <Stop offset="0.55" stopColor="#FCE4D4" />
          <Stop offset="1" stopColor="#F3A97E" />
        </LinearGradient>
        <LinearGradient id={`${id}-disc`} x1="0.2" y1="0" x2="0.8" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#E3EEF8" />
        </LinearGradient>
        <LinearGradient id={`${id}-glyph`} x1="0.3" y1="0" x2="0.7" y2="1">
          <Stop offset="0" stopColor="#A8CDEB" />
          <Stop offset="1" stopColor="#4F87B8" />
        </LinearGradient>
        <ClipPath id={`${id}-clip`}>
          <Circle cx={MID} cy={MID} r={DISC} />
        </ClipPath>
      </Defs>
      <Circle cx={MID} cy={MID} r={MID - 1} fill="none" stroke={`url(#${id}-ring)`} strokeWidth={2} />
      <Circle cx={MID} cy={MID} r={DISC} fill={`url(#${id}-disc)`} />
      <G clipPath={`url(#${id}-clip)`}>{glyph(`url(#${id}-glyph)`)}</G>
    </Svg>
  );
}

/** The member as a figure, not a photo: a head and shoulders, the shoulders cut by the disc. */
function ProfileAvatar() {
  return (
    <Medallion
      id="avatar"
      glyph={(fill) => (
        <>
          <Circle cx={MID} cy={MID - 4.5} r={6.6} fill={fill} />
          <Path
            d={`M${MID - 13} ${BUTTON} C${MID - 13} ${MID + 9} ${MID - 7.5} ${MID + 5} ${MID} ${MID + 5} C${MID + 7.5} ${MID + 5} ${MID + 13} ${MID + 9} ${MID + 13} ${BUTTON} Z`}
            fill={fill}
          />
        </>
      )}
    />
  );
}

type HomeHeaderProps = {
  name: string;
  abhaLinked?: boolean;
  hasUnread: boolean;
  onPressProfile: () => void;
  onPressNotifications: () => void;
};

/**
 * Top of Home: the profile button, who's signed in, and the bell. The profile is a figure, not a
 * photo, in a ringed disc the size of the bell's round of glass.
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
        style={({ pressed }) => [styles.medallion, pressed && styles.pressed]}>
        <ProfileAvatar />
        {/* A verified tick: the health ID is linked to ABHA. */}
        {abhaLinked ? (
          <View style={styles.abhaBadge}>
            <Check size={8} color={Colors.onInk} strokeWidth={3.6} />
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
        style={({ pressed }) => pressed && styles.pressed}>
        <Glass variant="small" radius={BUTTON / 2} style={styles.button}>
          <View>
            <Bell size={20} color={Colors.text} strokeWidth={2} />
          </View>
          {hasUnread ? <View style={styles.unreadDot} /> : null}
        </Glass>
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
  flex: {
    flex: 1,
  },
  // A white disc behind the face lifts it off the page; the ring is its edge, so the lift has no
  // edge line of its own.
  medallion: {
    width: BUTTON,
    height: BUTTON,
    borderRadius: BUTTON / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    boxShadow: '0 1px 2px rgba(30, 50, 70, 0.06), 0 6px 14px rgba(30, 50, 70, 0.1)',
  },
  // Small and tucked onto the ring at the bottom right.
  abhaBadge: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: 15,
    height: 15,
    borderRadius: 7.5,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
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
  // The bell: a round of glass.
  button: {
    width: BUTTON,
    height: BUTTON,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadDot: {
    position: 'absolute',
    top: 10,
    right: 11,
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
