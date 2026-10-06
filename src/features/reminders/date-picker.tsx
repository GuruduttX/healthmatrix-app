import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing } from '@/constants/theme';

import { fromDateKey, MONTH_NAMES, toDateKey, WEEKDAY_LETTERS } from './schedule';
import { type DateKey } from './types';

type DatePickerProps = {
  value: DateKey;
  onChange: (date: DateKey) => void;
  today: DateKey;
  /** Days before this cannot be picked. */
  minDate?: DateKey;
};

/** A month calendar. Today is outlined; the chosen day is filled. */
export function DatePicker({ value, onChange, today, minDate }: DatePickerProps) {
  const [month, setMonth] = useState(() => {
    const day = fromDateKey(value);
    return { y: day.getFullYear(), m: day.getMonth() };
  });

  const first = new Date(month.y, month.m, 1);
  const days = new Date(month.y, month.m + 1, 0).getDate();
  // Blank cells before the 1st, then the days, padded to whole weeks.
  const cells: (DateKey | null)[] = [
    ...Array.from({ length: first.getDay() }, () => null),
    ...Array.from({ length: days }, (_, i) => toDateKey(new Date(month.y, month.m, i + 1))),
  ];
  while (cells.length % 7) cells.push(null);

  const shift = (delta: number) =>
    setMonth(({ y, m }) => {
      const next = new Date(y, m + delta, 1);
      return { y: next.getFullYear(), m: next.getMonth() };
    });

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <NavButton label="Previous month" onPress={() => shift(-1)} icon={ChevronLeft} />
        <ThemedText type="bodyBold">
          {MONTH_NAMES[month.m]} {month.y}
        </ThemedText>
        <NavButton label="Next month" onPress={() => shift(1)} icon={ChevronRight} />
      </View>

      <View style={styles.grid}>
        {WEEKDAY_LETTERS.map((letter, i) => (
          <View key={`h${i}`} style={styles.cell}>
            <ThemedText type="caption" themeColor="textMuted">
              {letter}
            </ThemedText>
          </View>
        ))}
        {cells.map((date, i) => {
          if (!date) return <View key={`b${i}`} style={styles.cell} />;
          const selected = date === value;
          const disabled = !!minDate && date < minDate;
          return (
            <View key={date} style={styles.cell}>
              <Pressable
                onPress={() => onChange(date)}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityState={{ selected, disabled }}
                accessibilityLabel={fromDateKey(date).toDateString()}
                style={({ pressed }) => [
                  styles.day,
                  date === today && styles.today,
                  selected && styles.selected,
                  pressed && styles.pressed,
                ]}>
                <ThemedText
                  type={selected || date === today ? 'smallBold' : 'small'}
                  themeColor={selected ? 'onInk' : disabled ? 'textMuted' : 'text'}
                  style={disabled && styles.disabledText}>
                  {Number(date.slice(8))}
                </ThemedText>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function NavButton({
  label,
  onPress,
  icon: Icon,
}: {
  label: string;
  onPress: () => void;
  icon: typeof ChevronLeft;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => [styles.nav, pressed && styles.pressed]}>
      <Icon size={18} color={Colors.text} strokeWidth={2.4} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nav: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundSelected,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  day: {
    width: '100%',
    height: '100%',
    maxWidth: 44,
    maxHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.pill,
  },
  today: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  selected: {
    borderColor: Colors.ink,
    backgroundColor: Colors.ink,
  },
  disabledText: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.7,
  },
});
