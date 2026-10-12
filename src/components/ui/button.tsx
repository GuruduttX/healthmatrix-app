import { type LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, Pressable, StyleSheet, type PressableProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Radius, Shadows, Spacing } from '@/constants/theme';

type Variant = 'primary' | 'secondary' | 'soft' | 'danger';

type ButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  /**
   * `primary` orange, for the one main action. `secondary` white with a border. `soft` orange
   * on peach, for a second action beside a primary. `danger` for removing or cancelling.
   */
  variant?: Variant;
  size?: 'md' | 'sm';
  icon?: LucideIcon;
  /** Shows a spinner in place of the icon and blocks presses while an action runs. */
  loading?: boolean;
  /** The primary button's orange glow; turn off where it would crowd a card. */
  shadow?: boolean;
};

const TEXT: Record<Variant, string> = {
  primary: Colors.onInk,
  secondary: Colors.text,
  soft: Colors.primary,
  danger: Colors.danger,
};

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
  const textColor = TEXT[variant];
  const blocked = disabled || loading;

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
        blocked && styles.disabled,
        pressed && styles.pressed,
      ]}>
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : Icon ? (
        <Icon size={size === 'sm' ? 15 : 17} color={textColor} strokeWidth={2.3} />
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
    gap: 7,
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: Spacing.four - 4,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  small: {
    minHeight: 40,
    paddingVertical: 9,
    paddingHorizontal: Spacing.three,
  },
  label: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    lineHeight: 20,
  },
  smallLabel: {
    fontSize: 14,
  },
  primary: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
    boxShadow: Shadows.glow,
  },
  secondary: {
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
  },
  soft: {
    borderColor: Colors.primarySoft,
    backgroundColor: Colors.primarySoft,
  },
  danger: {
    borderColor: Colors.dangerSoft,
    backgroundColor: Colors.backgroundElement,
  },
  flat: {
    boxShadow: 'none',
  },
  disabled: {
    opacity: 0.5,
    boxShadow: 'none',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
