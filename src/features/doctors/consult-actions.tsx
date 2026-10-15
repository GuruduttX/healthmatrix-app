import { Video, type LucideIcon } from 'lucide-react-native';
import { type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { glassSurface } from '@/components/ui/glass';
import { LIST_LEAD } from '@/components/ui/list';
import { Colors, Fonts, Glass, Radius, Spacing } from '@/constants/theme';

import { DoctorAvatar } from './doctor-avatar';

/**
 * A line's one action with a word on it, as on Home's Today card: Join, Book. Solid when it is the
 * thing to do now, otherwise a pill of glass with deep orange words.
 */
export function PillButton({
  label,
  icon: Icon,
  solid,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  icon?: LucideIcon;
  solid?: boolean;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={({ pressed }) => [
        styles.pill,
        solid ? styles.solid : [glassSurface.flat, styles.soft],
        pressed && (solid ? styles.solidPressed : styles.softPressed),
      ]}>
      {Icon ? (
        <Icon size={14} color={solid ? Colors.onInk : Colors.primaryDeep} strokeWidth={2.8} />
      ) : null}
      <ThemedText style={[styles.pillText, !solid && styles.pillTextSoft]} numberOfLines={1}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

/**
 * A quiet action in words only: Cancel and Withdraw in crimson, a link in deep orange. A spinner
 * stands in while it runs.
 */
export function TextButton({
  label,
  tone = 'primary',
  busy,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  tone?: 'primary' | 'danger';
  busy?: boolean;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  const color = tone === 'danger' ? Colors.high : Colors.primaryDeep;
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ busy: !!busy, disabled: !!busy }}
      hitSlop={10}
      style={({ pressed }) => [styles.text, pressed && styles.pressed]}>
      {busy ? <ActivityIndicator size="small" color={color} /> : null}
      <ThemedText style={[styles.textLabel, { color }]} numberOfLines={1}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

/**
 * A quiet link under a row's words, as on past consults: an icon and a word, no fill. Deep orange,
 * or crimson for withdrawing; a spinner stands in for the icon while it runs.
 */
export function LinkButton({
  label,
  icon: Icon,
  tone = 'primary',
  busy,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  icon?: LucideIcon;
  tone?: 'primary' | 'danger';
  busy?: boolean;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  const color = tone === 'danger' ? Colors.high : Colors.primaryDeep;
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ busy: !!busy, disabled: !!busy }}
      hitSlop={8}
      style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
      {busy ? (
        <ActivityIndicator size="small" color={color} />
      ) : Icon ? (
        <Icon size={14} color={color} strokeWidth={2.4} />
      ) : null}
      <ThemedText style={[styles.textLabel, { color }]} numberOfLines={1}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

/** A row's links side by side, under its words. */
export function LinkRow({ children }: { children: ReactNode }) {
  return <View style={styles.links}>{children}</View>;
}

/** A doctor's photo with a camera badge, since every consult is on video; teal-blue when live. */
export function ConsultAvatar({
  name,
  photoUrl,
  live,
}: {
  name: string;
  photoUrl?: string;
  live?: boolean;
}) {
  return (
    <View>
      <DoctorAvatar name={name} photoUrl={photoUrl} size={LIST_LEAD} />
      <View style={[styles.badge, live && styles.badgeLive]}>
        <Video size={8} color={Colors.onInk} strokeWidth={3} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 32,
    paddingHorizontal: 13,
    borderRadius: Radius.pill,
  },
  solid: {
    backgroundColor: Colors.primaryDeep,
  },
  solidPressed: {
    backgroundColor: Colors.primaryInk,
    transform: [{ scale: 0.97 }],
  },
  soft: {
    backgroundColor: Glass.fillSoft,
  },
  softPressed: {
    backgroundColor: Colors.primaryTint,
    transform: [{ scale: 0.97 }],
  },
  pillText: {
    fontFamily: Fonts.bold,
    fontSize: 13.5,
    lineHeight: 18,
    color: Colors.onInk,
  },
  pillTextSoft: {
    color: Colors.primaryDeep,
  },
  text: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 32,
    paddingHorizontal: 2,
  },
  textLabel: {
    fontFamily: Fonts.bold,
    fontSize: 13.5,
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.6,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 28,
  },
  links: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three + 2,
    marginTop: Spacing.two - 2,
  },
  badge: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    width: 17,
    height: 17,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.backgroundElement,
    backgroundColor: Colors.ink,
  },
  badgeLive: {
    backgroundColor: Colors.good,
  },
});
