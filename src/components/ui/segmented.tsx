import { type LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Glass, Radius } from '@/constants/theme';

import { webBlur } from './glass';

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
  icon?: LucideIcon;
  /** A small count badge after the label; hidden when 0. */
  count?: number;
};

type SegmentedProps<T extends string> = {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
};

/**
 * A row of two to four mutually exclusive options on a track of glass, the chosen one a brighter
 * pane raised above it.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  disabled = false,
}: SegmentedProps<T>) {
  return (
    <View style={[styles.track, webBlur]} accessibilityRole="tablist">
      {options.map(({ value: option, label, icon: Icon, count }) => {
        const selected = option === value;
        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            disabled={disabled}
            accessibilityRole="tab"
            accessibilityState={{ selected, disabled }}
            style={({ pressed }) => [
              styles.segment,
              selected && styles.selected,
              pressed && !selected && styles.pressed,
            ]}>
            {Icon ? (
              <Icon
                size={15}
                color={selected ? Colors.text : Colors.textFaint}
                strokeWidth={2.3}
              />
            ) : null}
            <ThemedText
              numberOfLines={1}
              style={[styles.label, { color: selected ? Colors.text : Colors.textFaint }]}>
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
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Glass.rim,
    backgroundColor: 'rgba(255, 255, 255, 0.32)',
    boxShadow: `${Glass.glowSmall}, ${Glass.shadowFlat}`,
  },
  segment: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 8,
    borderRadius: Radius.pill,
  },
  selected: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    boxShadow: Glass.shadowSmall,
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    flexShrink: 1,
    fontFamily: Fonts.bold,
    fontSize: 14,
    lineHeight: 18,
  },
  count: {
    minWidth: 20,
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.pill,
    backgroundColor: Colors.hairline,
  },
  countSelected: {
    backgroundColor: Colors.primaryDeep,
  },
  countText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    lineHeight: 15,
    color: Colors.textSoft,
    fontVariant: ['tabular-nums'],
  },
  countTextSelected: {
    color: Colors.onInk,
  },
});
