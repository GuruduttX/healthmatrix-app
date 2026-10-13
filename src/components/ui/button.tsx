import { type LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, Pressable, StyleSheet, type PressableProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Radius, Shadows, Spacing } from '@/constants/theme';

type Variant = 'primary' | 'secondary' | 'soft' | 'danger';

type ButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  /**
   * `primary` orange, for the one main action. `secondary` white with a hairline, beside it.
   * `soft` deep orange on a peach tint, for a quiet call to act. `danger` for removing or
   * cancelling: crimson words on white, never orange.
   */
  variant?: Variant;
  size?: 'md' | 'sm';
  icon?: LucideIcon;
  /** Shows a spinner in place of the icon and blocks presses while an action runs. */
  loading?: boolean;
  /** The primary button's close shadow; turn off where it sits inside a card. */
  shadow?: boolean;
};

const TEXT: Record<Variant, string> = {
  primary: Colors.onInk,
  secondary: Colors.text,
  soft: Colors.primaryDeep,
  danger: Colors.high,
};

/** Each variant's colour while pressed: a shade deeper, never just faded. */
const PRESSED = StyleSheet.create({
  primary: { borderColor: Colors.primaryDeep, backgroundColor: Colors.primaryDeep },
  secondary: { backgroundColor: Colors.well },
  soft: { borderColor: Colors.primaryTintStrong, backgroundColor: Colors.primaryTintStrong },
  danger: { backgroundColor: Colors.highSoft },
});

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  loading = false,
  shadow = true,
  disabled,
  ...props
}: ButtonProps) {
  const blocked = disabled || loading;
  // Not ready yet (a form still incomplete): a quiet warm grey, not a faded slab of orange.
  // While an action runs, the button keeps its colour with a spinner.
  const off = !!disabled && !loading;
  const textColor = off ? Colors.textFaint : TEXT[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!blocked, busy: loading }}
      {...props}
      disabled={blocked}
      style={({ pressed }) => [
        styles.base,
        size === 'sm' && styles.small,
        styles[variant],
        !shadow && styles.flat,
        off && styles.off,
        loading && styles.busy,
        pressed && [styles.pressed, PRESSED[variant]],
      ]}>
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : Icon ? (
        <Icon size={size === 'sm' ? 15 : 16} color={textColor} strokeWidth={2.4} />
      ) : null}
      <ThemedText
        type="smallBold"
        style={[styles.label, size === 'sm' && styles.smallLabel, { color: textColor }]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: Spacing.four - 4,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  small: {
    minHeight: 40,
    paddingVertical: 9,
    paddingHorizontal: Spacing.three - 2,
  },
  label: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    lineHeight: 20,
  },
  smallLabel: {
    fontSize: 14,
    lineHeight: 18,
  },
  primary: {
    borderColor: Colors.primaryBright,
    backgroundColor: Colors.primaryBright,
    boxShadow: Shadows.button,
  },
  secondary: {
    borderColor: Colors.hairline,
    backgroundColor: Colors.backgroundElement,
    boxShadow: Shadows.soft,
  },
  soft: {
    borderColor: Colors.primaryTint,
    backgroundColor: Colors.primaryTint,
  },
  danger: {
    borderColor: Colors.hairline,
    backgroundColor: Colors.backgroundElement,
  },
  flat: {
    boxShadow: 'none',
  },
  off: {
    borderColor: Colors.hairline,
    backgroundColor: Colors.backgroundSelected,
    boxShadow: 'none',
  },
  busy: {
    opacity: 0.85,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
});
