import { ChevronLeft, X } from 'lucide-react-native';
import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Shadows, Spacing } from '@/constants/theme';

const BUTTON = 42;

type StackHeaderProps = {
  onBack: () => void;
  /** Where Back goes, for screen readers: "Back to Care". */
  backLabel?: string;
  /** Short, centred. Leave out when the screen shows its own big title below. */
  title?: string;
  /** A close (×) instead of a back arrow, for screens opened as a modal. */
  close?: boolean;
  /** One small action at the right, e.g. a header button. */
  right?: ReactNode;
  /** `dark` on an ink background: glass button, white title. */
  tone?: 'light' | 'dark';
};

/** The bar at the top of a screen opened from a tab: a round back button, title, one action. */
export function StackHeader({
  onBack,
  backLabel,
  title,
  close = false,
  right,
  tone = 'light',
}: StackHeaderProps) {
  const dark = tone === 'dark';
  const Icon = close ? X : ChevronLeft;

  return (
    <View style={styles.bar}>
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel={backLabel ? `Back to ${backLabel}` : close ? 'Close' : 'Back'}
        hitSlop={6}
        style={({ pressed }) => [styles.button, dark && styles.buttonDark, pressed && styles.pressed]}>
        <Icon size={21} color={dark ? Colors.onInk : Colors.text} strokeWidth={2.3} />
      </Pressable>

      <ThemedText
        type="bodyBold"
        numberOfLines={1}
        accessibilityRole="header"
        style={[styles.title, dark && styles.titleDark]}>
        {title ?? ''}
      </ThemedText>

      <View style={styles.right}>{right}</View>
    </View>
  );
}

/** A round icon button that matches the back button, for `right`. */
export function HeaderIconButton({
  icon,
  label,
  onPress,
  tone = 'light',
}: {
  icon: ReactNode;
  label: string;
  onPress: () => void;
  tone?: 'light' | 'dark';
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => [
        styles.button,
        tone === 'dark' && styles.buttonDark,
        pressed && styles.pressed,
      ]}>
      {icon}
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
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  button: {
    width: BUTTON,
    height: BUTTON,
    borderRadius: BUTTON / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
    boxShadow: Shadows.card,
  },
  buttonDark: {
    borderColor: Colors.glassBorder,
    backgroundColor: Colors.glass,
    boxShadow: 'none',
  },
  pressed: {
    opacity: 0.7,
  },
  title: {
    flex: 1,
    textAlign: 'center',
  },
  titleDark: {
    color: Colors.onInk,
  },
  // Same width as the back button, so the title stays centred.
  right: {
    minWidth: BUTTON,
    alignItems: 'flex-end',
  },
});
