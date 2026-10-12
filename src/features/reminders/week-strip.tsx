import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Surface } from '@/components/ui/surface';
import { Colors, Radius, Spacing } from '@/constants/theme';

import { addDays, fromDateKey, MONTH_NAMES, WEEKDAY_NAMES } from './schedule';
import { type DateKey } from './types';

/** A dot under a day: every dose done, or something left unmarked. */
export type DayMark = 'done' | 'missed';

type WeekStripProps = {
  selected: DateKey;
  today: DateKey;
  onSelect: (date: DateKey) => void;
  markFor: (date: DateKey) => DayMark | undefined;
};

/** Sunday to Saturday around the chosen day, with arrows to move a week at a time. */
export function WeekStrip({ selected, today, onSelect, markFor }: WeekStripProps) {
  const sunday = addDays(selected, -fromDateKey(selected).getDay());
  const days = Array.from({ length: 7 }, (_, i) => addDays(sunday, i));
  const month = fromDateKey(selected);

  return (
    <Surface style={styles.card}>
      <View style={styles.header}>
        <ThemedText type="smallBold">
          {MONTH_NAMES[month.getMonth()]} {month.getFullYear()}
        </ThemedText>
        <View style={styles.nav}>
          {selected !== today ? (
            <Pressable onPress={() => onSelect(today)} hitSlop={8} accessibilityRole="button">
              <ThemedText type="smallBold" themeColor="primary">
                Today
              </ThemedText>
            </Pressable>
          ) : null}
          <Arrow label="Previous week" icon={ChevronLeft} onPress={() => onSelect(addDays(selected, -7))} />
          <Arrow label="Next week" icon={ChevronRight} onPress={() => onSelect(addDays(selected, 7))} />
        </View>
      </View>

      <View style={styles.days}>
        {days.map((date) => {
          const isSelected = date === selected;
          const mark = markFor(date);
          const day = fromDateKey(date);
          return (
            <Pressable
              key={date}
              onPress={() => onSelect(date)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={day.toDateString()}
              style={({ pressed }) => [
                styles.day,
                date === today && styles.today,
                isSelected && styles.selected,
                pressed && styles.pressed,
              ]}>
              <ThemedText type="caption" themeColor={isSelected ? 'onInk' : 'textSecondary'}>
                {WEEKDAY_NAMES[day.getDay()]}
              </ThemedText>
              <ThemedText type="bodyBold" themeColor={isSelected ? 'onInk' : 'text'}>
                {day.getDate()}
              </ThemedText>
              <View
                style={[
                  styles.dot,
                  mark === 'done' && styles.dotDone,
                  mark === 'missed' && styles.dotMissed,
                ]}
              />
            </Pressable>
          );
        })}
      </View>
    </Surface>
  );
}

function Arrow({ label, icon: Icon, onPress }: { label: string; icon: typeof ChevronLeft; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => [styles.arrow, pressed && styles.pressed]}>
      <Icon size={16} color={Colors.text} strokeWidth={2.4} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.two + 2,
    paddingHorizontal: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 2,
  },
  arrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundSelected,
  },
  days: {
    flexDirection: 'row',
    gap: 4,
  },
  day: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingTop: 8,
    paddingBottom: 7,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  today: {
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.primarySoft,
  },
  selected: {
    borderColor: Colors.ink,
    backgroundColor: Colors.ink,
    boxShadow: '0 8px 18px rgba(14, 42, 51, 0.25)',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 2,
  },
  dotDone: {
    backgroundColor: Colors.success,
  },
  dotMissed: {
    backgroundColor: Colors.warning,
  },
  pressed: {
    opacity: 0.7,
  },
});
