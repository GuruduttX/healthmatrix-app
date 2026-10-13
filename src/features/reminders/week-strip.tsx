import { Check, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Radius, Shadows, Spacing } from '@/constants/theme';

import { addDays, fromDateKey, MONTH_NAMES, WEEKDAY_NAMES } from './schedule';
import { type DateKey } from './types';

/** A mark under a day: every dose done, or something left unmarked. */
export type DayMark = 'done' | 'missed';

const MARK_WORDS: Record<DayMark, string> = {
  done: 'every dose marked',
  missed: 'doses not marked',
};

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
    <View style={styles.card}>
      <View style={styles.header}>
        <ThemedText style={styles.month} numberOfLines={1}>
          {MONTH_NAMES[month.getMonth()]} {month.getFullYear()}
        </ThemedText>
        {selected !== today ? (
          <Pressable
            onPress={() => onSelect(today)}
            hitSlop={8}
            accessibilityRole="button"
            style={({ pressed }) => [styles.todayLink, pressed && styles.pressed]}>
            <ThemedText style={styles.todayLinkText}>Today</ThemedText>
          </Pressable>
        ) : null}
        <Arrow
          label="Previous week"
          icon={ChevronLeft}
          onPress={() => onSelect(addDays(selected, -7))}
        />
        <Arrow label="Next week" icon={ChevronRight} onPress={() => onSelect(addDays(selected, 7))} />
      </View>

      <View style={styles.days}>
        {days.map((date) => {
          const isSelected = date === selected;
          const isToday = date === today;
          const mark = markFor(date);
          const day = fromDateKey(date);
          return (
            <Pressable
              key={date}
              onPress={() => onSelect(date)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${day.toDateString()}${mark ? `, ${MARK_WORDS[mark]}` : ''}`}
              style={({ pressed }) => [
                styles.day,
                isToday && styles.today,
                isSelected && styles.selected,
                pressed && styles.pressed,
              ]}>
              <ThemedText
                style={[
                  styles.weekday,
                  isToday && styles.todayText,
                  isSelected && styles.selectedWeekday,
                ]}>
                {WEEKDAY_NAMES[day.getDay()]}
              </ThemedText>
              <ThemedText
                style={[styles.date, isToday && styles.todayText, isSelected && styles.selectedText]}>
                {day.getDate()}
              </ThemedText>
              {/* A tick when the day is done, a dot when something was left unmarked. */}
              <View style={styles.mark}>
                {mark === 'done' ? (
                  <Check
                    size={11}
                    color={isSelected ? Colors.onInk : Colors.good}
                    strokeWidth={3.2}
                  />
                ) : mark === 'missed' ? (
                  <View style={[styles.dot, isSelected && styles.dotOnInk]} />
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Arrow({
  label,
  icon: Icon,
  onPress,
}: {
  label: string;
  icon: typeof ChevronLeft;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => [styles.arrow, pressed && styles.arrowPressed]}>
      <Icon size={17} color={Colors.text} strokeWidth={2.3} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.two + 2,
    paddingTop: Spacing.three - 4,
    paddingBottom: Spacing.two + 2,
    paddingHorizontal: Spacing.two + 2,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.hairline,
    backgroundColor: Colors.backgroundElement,
    boxShadow: Shadows.soft,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingLeft: Spacing.one,
  },
  month: {
    flex: 1,
    fontFamily: Fonts.displaySemibold,
    fontSize: 16.5,
    lineHeight: 21,
    letterSpacing: -0.3,
    color: Colors.text,
  },
  todayLink: {
    paddingHorizontal: Spacing.one,
  },
  todayLinkText: {
    fontFamily: Fonts.bold,
    fontSize: 13.5,
    lineHeight: 18,
    color: Colors.primaryDeep,
  },
  arrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.hairline,
    backgroundColor: Colors.backgroundElement,
  },
  arrowPressed: {
    backgroundColor: Colors.well,
    transform: [{ scale: 0.96 }],
  },
  days: {
    flexDirection: 'row',
    gap: 2,
  },
  day: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 7,
    paddingBottom: 4,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  // Today, when another day is chosen: a peach ring, no fill.
  today: {
    borderColor: Colors.primaryTintStrong,
  },
  selected: {
    borderColor: Colors.text,
    backgroundColor: Colors.text,
  },
  weekday: {
    fontFamily: Fonts.semibold,
    fontSize: 11.5,
    lineHeight: 15,
    color: Colors.textFaint,
  },
  date: {
    marginTop: 1,
    fontFamily: Fonts.displaySemibold,
    fontSize: 17,
    lineHeight: 22,
    color: Colors.text,
    fontVariant: ['tabular-nums'],
  },
  todayText: {
    color: Colors.primaryDeep,
  },
  selectedWeekday: {
    color: Colors.onInkMuted,
  },
  selectedText: {
    color: Colors.onInk,
  },
  mark: {
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.watch,
  },
  // The watch colour is too dark on ink; its light tint reads there.
  dotOnInk: {
    backgroundColor: Colors.watchSoft,
  },
  pressed: {
    opacity: 0.7,
  },
});
