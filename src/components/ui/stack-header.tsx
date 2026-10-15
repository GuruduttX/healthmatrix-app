import { ChevronLeft, X } from 'lucide-react-native';
import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Gutter, Radius, Spacing } from '@/constants/theme';

import { glassSurface } from './glass';

/** Home's header buttons are 46; a screen's bar is a touch quieter. */
const BUTTON = 44;

type StackHeaderProps = {
  onBack: () => void;
  /** Where Back goes, for screen readers: "Back to Care". */
  backLabel?: string;
  /** Short, centred. Leave out when the screen shows its own big title below. */
  title?: string;
  /** A close (×) instead of a back arrow, for screens opened as a modal. */
  close?: boolean;
  /** One small action at the right, e.g. a `HeaderIconButton`. */
  right?: ReactNode;
};

/**
 * The bar at the top of a screen opened from a tab: a round glass back button like Home's bell, a
 * centred title, and one action.
 */
export function StackHeader({ onBack, backLabel, title, close = false, right }: StackHeaderProps) {
  const Icon = close ? X : ChevronLeft;

  return (
    <View style={styles.bar}>
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel={backLabel ? `Back to ${backLabel}` : close ? 'Close' : 'Back'}
        hitSlop={6}
        style={({ pressed }) => [glassSurface.small, styles.button, pressed && styles.pressed]}>
        <Icon size={21} color={Colors.text} strokeWidth={2.2} />
      </Pressable>

      <ThemedText numberOfLines={1} accessibilityRole="header" style={styles.title}>
        {title ?? ''}
      </ThemedText>

      <View style={styles.right}>{right}</View>
    </View>
  );
}

/**
 * A round glass button that matches the back button, for `right` or a tab page's `headerRight`.
 * With `text`, a glass pill with the icon and a word: "Share", "Add".
 */
export function HeaderIconButton({
  icon,
  label,
  text,
  onPress,
}: {
  icon: ReactNode;
  /** What a screen reader says. */
  label: string;
  text?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => [
        glassSurface.small,
        styles.button,
        text ? styles.pill : null,
        pressed && styles.pressed,
      ]}>
      {icon}
      {text ? <ThemedText style={styles.pillText}>{text}</ThemedText> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: BUTTON + Spacing.three,
    paddingHorizontal: Gutter,
    paddingVertical: Spacing.two,
  },
  button: {
    width: BUTTON,
    height: BUTTON,
    borderRadius: BUTTON / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    width: 'auto',
    flexDirection: 'row',
    gap: 6,
    paddingLeft: 13,
    paddingRight: 16,
    borderRadius: Radius.pill,
  },
  pillText: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    lineHeight: 18,
    color: Colors.text,
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontFamily: Fonts.displaySemibold,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.2,
    color: Colors.text,
  },
  // Same width as the back button, so the title stays centred.
  right: {
    minWidth: BUTTON,
    alignItems: 'flex-end',
  },
});
