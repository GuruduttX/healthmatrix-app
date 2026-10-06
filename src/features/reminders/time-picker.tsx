import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

import { type TimeKey } from './types';

const pad = (n: number) => String(n).padStart(2, '0');

function split(time: TimeKey) {
  const [hh, mm] = time.split(':').map(Number) as [number, number];
  return { hh, mm };
}

const join = (hh: number, mm: number): TimeKey => `${pad(hh)}:${pad(mm)}`;

type TimePickerProps = {
  value: TimeKey;
  onChange: (time: TimeKey) => void;
};

/**
 * Hour and minute with AM/PM. Tap a number to type it, or use the arrows: hours move by one,
 * minutes in steps of 5.
 */
export function TimePicker({ value, onChange }: TimePickerProps) {
  const { hh, mm } = split(value);
  const pm = hh >= 12;
  const hour12 = hh % 12 || 12;

  const stepHour = (delta: number) => onChange(join((hh + delta + 24) % 24, mm));
  const stepMinute = (delta: number) => {
    // From an odd minute such as 07, go to the next multiple of 5 in that direction.
    const next = delta > 0 ? Math.floor(mm / 5) * 5 + 5 : Math.ceil(mm / 5) * 5 - 5;
    onChange(join(hh, (next + 60) % 60));
  };
  const setPm = (wantPm: boolean) => {
    if (wantPm !== pm) onChange(join((hh + 12) % 24, mm));
  };

  return (
    <View style={styles.wrap}>
      <Column
        value={String(hour12)}
        label="hour"
        min={1}
        max={12}
        onType={(hour) => onChange(join((hour % 12) + (pm ? 12 : 0), mm))}
        onUp={() => stepHour(1)}
        onDown={() => stepHour(-1)}
      />
      <ThemedText style={styles.colon}>:</ThemedText>
      <Column
        value={pad(mm)}
        label="minute"
        min={0}
        max={59}
        onType={(minute) => onChange(join(hh, minute))}
        onUp={() => stepMinute(1)}
        onDown={() => stepMinute(-1)}
      />
      <View style={styles.meridiem}>
        {[
          { label: 'AM', active: !pm, value: false },
          { label: 'PM', active: pm, value: true },
        ].map((option) => (
          <Pressable
            key={option.label}
            onPress={() => setPm(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: option.active }}
            style={({ pressed }) => [
              styles.meridiemOption,
              option.active && styles.meridiemActive,
              pressed && styles.pressed,
            ]}>
            <ThemedText type="smallBold" themeColor={option.active ? 'onInk' : 'textSecondary'}>
              {option.label}
            </ThemedText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

type ColumnProps = {
  value: string;
  label: string;
  min: number;
  max: number;
  /** Called as soon as what is typed is a whole number between `min` and `max`. */
  onType: (value: number) => void;
  onUp: () => void;
  onDown: () => void;
};

function Column({ value, label, min, max, onType, onUp, onDown }: ColumnProps) {
  // What is being typed. While set, the box shows it as is ("4" on the way to "45"); it goes
  // back to the formatted value when the box loses focus or an arrow is used.
  const [draft, setDraft] = useState<string | null>(null);

  const type = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 2);
    setDraft(digits);
    const n = Number(digits);
    if (digits && n >= min && n <= max) onType(n);
  };

  const step = (move: () => void) => () => {
    setDraft(null);
    move();
  };

  return (
    <View style={styles.column}>
      <StepButton icon="up" label={`Later ${label}`} onPress={step(onUp)} />
      <TextInput
        value={draft ?? value}
        onChangeText={type}
        onBlur={() => setDraft(null)}
        keyboardType="number-pad"
        returnKeyType="done"
        maxLength={2}
        selectTextOnFocus
        accessibilityLabel={label === 'hour' ? 'Hour' : 'Minute'}
        style={[styles.value, styles.valueBox, draft !== null && styles.valueEditing]}
      />
      <StepButton icon="down" label={`Earlier ${label}`} onPress={step(onDown)} />
    </View>
  );
}

function StepButton({ icon, label, onPress }: { icon: 'up' | 'down'; label: string; onPress: () => void }) {
  const Icon = icon === 'up' ? ChevronUp : ChevronDown;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      style={({ pressed }) => [styles.step, pressed && styles.pressed]}>
      <Icon size={20} color={Colors.text} strokeWidth={2.4} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  column: {
    alignItems: 'center',
    gap: 6,
  },
  step: {
    width: 64,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    backgroundColor: Colors.backgroundSelected,
  },
  valueBox: {
    width: 64,
    paddingVertical: 2,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
    textAlign: 'center',
  },
  valueEditing: {
    borderColor: Colors.ink,
  },
  value: {
    fontFamily: Fonts.display,
    fontSize: 32,
    lineHeight: 40,
    color: Colors.text,
  },
  colon: {
    fontFamily: Fonts.display,
    fontSize: 32,
    lineHeight: 42,
  },
  meridiem: {
    marginLeft: Spacing.two,
    gap: 6,
  },
  meridiemOption: {
    width: 56,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
  },
  meridiemActive: {
    borderColor: Colors.ink,
    backgroundColor: Colors.ink,
  },
  pressed: {
    opacity: 0.7,
  },
});
