import { type LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radius } from '@/constants/theme';

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: LucideIcon;
  /** `glass` for chips on a dark header: see-through, and white once selected. */
  variant?: 'default' | 'glass';
  disabled?: boolean;
};

/** Pill used for filters and time slots. */
export function Chip({
  label,
  selected = false,
  onPress,
  icon: Icon,
  variant = 'default',
  disabled = false,
}: ChipProps) {
  const glass = variant === 'glass';
  const color = glass
    ? selected
      ? Colors.ink
      : Colors.onInk
    : selected
      ? Colors.onInk
      : Colors.textSecondary;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      style={({ pressed }) => [
        styles.chip,
        glass && styles.glass,
        selected && (glass ? styles.glassSelected : styles.selected),
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}>
      {Icon ? <Icon size={14} color={color} strokeWidth={2.4} /> : null}
      <ThemedText type="smallBold" style={{ color }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
  },
  selected: {
    borderColor: Colors.ink,
    backgroundColor: Colors.ink,
  },
  glass: {
    borderColor: Colors.glassBorder,
    backgroundColor: Colors.glass,
  },
  glassSelected: {
    borderColor: Colors.onInk,
    backgroundColor: Colors.onInk,
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.75,
  },
});
