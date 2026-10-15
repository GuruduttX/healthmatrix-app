import { type LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Radius } from '@/constants/theme';

import { glassSurface } from './glass';

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: LucideIcon;
  /** A small number after the label, e.g. how many records a filter shows. */
  count?: number;
  disabled?: boolean;
};

/**
 * Pill used for filters and time slots: a pill of glass, solid ink once chosen, so the choice
 * reads without adding more orange.
 */
export function Chip({
  label,
  selected = false,
  onPress,
  icon: Icon,
  count,
  disabled = false,
}: ChipProps) {
  const color = selected ? Colors.onInk : Colors.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={count ? `${label}, ${count}` : undefined}
      style={({ pressed }) => [
        glassSurface.small,
        styles.chip,
        selected && styles.selected,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}>
      {Icon ? <Icon size={14} color={color} strokeWidth={2.4} /> : null}
      <ThemedText style={[styles.label, { color }]} numberOfLines={1}>
        {label}
      </ThemedText>
      {count ? (
        <View style={[styles.count, selected && styles.countSelected]}>
          <ThemedText style={[styles.countText, selected && styles.countTextSelected]}>
            {count}
          </ThemedText>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 38,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: Radius.pill,
  },
  selected: {
    borderColor: Colors.text,
    backgroundColor: Colors.text,
    boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.18), 0 4px 12px rgba(14, 42, 51, 0.18)',
  },
  disabled: {
    opacity: 0.4,
    boxShadow: 'none',
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  label: {
    fontFamily: Fonts.bold,
    fontSize: 13.5,
    lineHeight: 18,
  },
  count: {
    minWidth: 20,
    alignItems: 'center',
    marginRight: -6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.pill,
    backgroundColor: Colors.well,
  },
  countSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  countText: {
    fontFamily: Fonts.bold,
    fontSize: 11.5,
    lineHeight: 15,
    color: Colors.textSoft,
    fontVariant: ['tabular-nums'],
  },
  countTextSelected: {
    color: Colors.onInk,
  },
});
