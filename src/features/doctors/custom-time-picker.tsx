import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Chip } from '@/components/ui/chip';
import { Fonts, Spacing } from '@/constants/theme';

/** Hours the picker offers, 7 AM to 10 PM. */
const HOURS = Array.from({ length: 16 }, (_, i) => i + 7);
/** Starts fall on 5-minute marks. Matches `START_STEP_MINUTES` in `server/schedule.ts`. */
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

const pad = (n: number) => String(n).padStart(2, '0');
const hourLabel = (hour: number) => `${hour % 12 || 12} ${hour < 12 ? 'AM' : 'PM'}`;

type CustomTimePickerProps = {
  /** "HH:mm", or null before one is picked. */
  value: string | null;
  onChange: (time: string | null) => void;
  /**
   * The earliest "HH:mm" that can be asked for on this day (30 minutes from now, today), or null
   * when the whole day is open.
   */
  earliest: string | null;
};

/**
 * Picks any time on a 5-minute mark, hour first, then minutes, for a custom-time request.
 * Times before `earliest` can't be picked.
 */
export function CustomTimePicker({ value, onChange, earliest }: CustomTimePickerProps) {
  const [hour, minute] = value ? value.split(':').map(Number) : [null, null];
  const ok = (time: string) => !earliest || time >= earliest;

  const pickHour = (next: number) => {
    // Keep the minutes if they still work in the new hour, otherwise take the first that does.
    const keep = minute !== null && ok(`${pad(next)}:${pad(minute)}`) ? minute : null;
    const first = keep ?? MINUTES.find((m) => ok(`${pad(next)}:${pad(m)}`));
    onChange(first === undefined ? null : `${pad(next)}:${pad(first)}`);
  };

  return (
    <View style={styles.root}>
      <View style={styles.group}>
        <ThemedText type="caption" themeColor="textSecondary" style={styles.label}>
          Hour
        </ThemedText>
        <View style={styles.wrap}>
          {HOURS.map((h) => {
            const open = MINUTES.some((m) => ok(`${pad(h)}:${pad(m)}`));
            return open ? (
              <Chip
                key={h}
                label={hourLabel(h)}
                selected={hour === h}
                onPress={() => pickHour(h)}
              />
            ) : null;
          })}
        </View>
      </View>

      {hour !== null ? (
        <View style={styles.group}>
          <ThemedText type="caption" themeColor="textSecondary" style={styles.label}>
            Minutes
          </ThemedText>
          <View style={styles.wrap}>
            {MINUTES.map((m) => {
              const time = `${pad(hour)}:${pad(m)}`;
              return ok(time) ? (
                <Chip
                  key={m}
                  label={`:${pad(m)}`}
                  selected={minute === m}
                  onPress={() => onChange(time)}
                />
              ) : null;
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: Spacing.three,
  },
  group: {
    gap: Spacing.two,
  },
  label: {
    fontFamily: Fonts.semibold,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
