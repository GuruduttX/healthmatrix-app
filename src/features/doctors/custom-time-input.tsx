import { useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Chip } from '@/components/ui/chip';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

const pad = (n: number) => String(n).padStart(2, '0');

/** Hour, minute and AM/PM as typed, as "HH:mm" on the 24-hour clock, or null if not a time. */
function toTime(hour: string, minute: string, pm: boolean) {
  if (!/^\d{1,2}$/.test(hour) || !/^\d{1,2}$/.test(minute)) return null;
  const h = Number(hour);
  const m = Number(minute);
  if (h < 1 || h > 12 || m > 59) return null;
  return `${pad((h % 12) + (pm ? 12 : 0))}:${pad(m)}`;
}

type CustomTimeInputProps = {
  /** "HH:mm" to start from. Remount (with `key`) to start again from another time. */
  initial: string;
  /** Called with "HH:mm" whenever the typed time is complete, and null while it isn't. */
  onChange: (time: string | null) => void;
  /** Shown under the fields, e.g. that the time has passed. */
  error?: string | null;
};

/**
 * Types a time of day for a custom-time request: hour, minute, AM or PM. Any minute works, so
 * 3:27 PM can be asked for as easily as 3:30.
 */
export function CustomTimeInput({ initial, onChange, error }: CustomTimeInputProps) {
  const [h, m] = initial.split(':').map(Number) as [number, number];
  const [hour, setHour] = useState(String(h % 12 || 12));
  const [minute, setMinute] = useState(pad(m));
  const [pm, setPm] = useState(h >= 12);
  const minuteInput = useRef<TextInput>(null);

  const update = (next: { hour?: string; minute?: string; pm?: boolean }) => {
    const nextHour = next.hour ?? hour;
    const nextMinute = next.minute ?? minute;
    const nextPm = next.pm ?? pm;
    setHour(nextHour);
    setMinute(nextMinute);
    setPm(nextPm);
    onChange(toTime(nextHour, nextMinute, nextPm));
  };

  return (
    <View style={styles.root}>
      <View style={styles.row}>
        <TextInput
          value={hour}
          onChangeText={(text) => {
            const digits = text.replace(/\D/g, '').slice(0, 2);
            update({ hour: digits });
            // Two digits, or a digit no hour starts with besides itself: on to the minutes.
            if (digits.length === 2 || /^[2-9]$/.test(digits)) minuteInput.current?.focus();
          }}
          keyboardType="number-pad"
          maxLength={2}
          selectTextOnFocus
          accessibilityLabel="Hour"
          placeholder="hh"
          placeholderTextColor={Colors.textMuted}
          style={[styles.field, !!error && styles.fieldError]}
        />
        <ThemedText style={styles.colon}>:</ThemedText>
        <TextInput
          ref={minuteInput}
          value={minute}
          onChangeText={(text) => update({ minute: text.replace(/\D/g, '').slice(0, 2) })}
          onBlur={() => {
            // "5" means :05.
            if (/^\d$/.test(minute)) update({ minute: pad(Number(minute)) });
          }}
          keyboardType="number-pad"
          maxLength={2}
          selectTextOnFocus
          accessibilityLabel="Minutes"
          placeholder="mm"
          placeholderTextColor={Colors.textMuted}
          style={[styles.field, !!error && styles.fieldError]}
        />
        <View style={styles.meridiem}>
          <Chip label="AM" selected={!pm} onPress={() => update({ pm: false })} />
          <Chip label="PM" selected={pm} onPress={() => update({ pm: true })} />
        </View>
      </View>
      {error ? (
        <ThemedText type="caption" themeColor="danger" accessibilityLiveRegion="polite">
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  field: {
    width: 64,
    minHeight: 54,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
    color: Colors.text,
    fontFamily: Fonts.bold,
    fontSize: 22,
    textAlign: 'center',
  },
  fieldError: {
    borderColor: Colors.danger,
  },
  colon: {
    fontFamily: Fonts.bold,
    fontSize: 22,
    lineHeight: 28,
  },
  meridiem: {
    flexDirection: 'row',
    gap: Spacing.one + 2,
    marginLeft: Spacing.two,
  },
});
