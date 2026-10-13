import { type LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Shadows } from '@/constants/theme';

type CallControlProps = {
  icon: LucideIcon;
  /** Shown under the button and read by screen readers. */
  label: string;
  onPress: () => void;
  /** `off` is a muted mic or a stopped camera: it flips colour, so it stands out. */
  tone?: 'on' | 'off' | 'end';
  /** `light` in the waiting room, on the warm page; `dark` over the call's video. */
  surface?: 'dark' | 'light';
  size?: number;
  disabled?: boolean;
};

/** Hang-up red: brighter than `high`, so it reads on the dark call screen. */
const END_RED = '#E5372B';

const TONES = {
  dark: {
    on: { background: 'rgba(255, 255, 255, 0.16)', icon: Colors.onInk },
    off: { background: Colors.onInk, icon: Colors.ink },
    end: { background: END_RED, icon: Colors.onInk },
  },
  // White rounds like Home's header buttons; a muted mic turns solid ink, as a chosen chip does.
  light: {
    on: { background: Colors.backgroundElement, icon: Colors.text },
    off: { background: Colors.text, icon: Colors.onInk },
    end: { background: END_RED, icon: Colors.onInk },
  },
} as const;

/** A round button in the call's control bar, with its label underneath. */
export function CallControl({
  icon: Icon,
  label,
  onPress,
  tone = 'on',
  surface = 'dark',
  size = 58,
  disabled,
}: CallControlProps) {
  const light = surface === 'light';
  // On the warm page a control that can't be used stays white, its icon greyed, instead of a
  // faded ink round.
  const colors =
    light && disabled
      ? { background: Colors.backgroundElement, icon: Colors.textMuted }
      : TONES[surface][tone];
  return (
    <View style={styles.item}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled, selected: tone === 'off' }}
        hitSlop={6}
        style={({ pressed }) => [
          styles.button,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.background },
          light && (tone === 'on' || disabled) && styles.lightOn,
          light && !disabled && styles.lightShadow,
          pressed && styles.pressed,
          disabled && (light ? styles.disabledLight : styles.disabled),
        ]}>
        <Icon size={size * 0.4} color={colors.icon} strokeWidth={2.2} />
      </Pressable>
      <ThemedText style={[styles.label, light && styles.labelLight]} numberOfLines={1}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    alignItems: 'center',
    gap: 6,
    minWidth: 64,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightOn: {
    borderWidth: 1,
    borderColor: Colors.hairline,
  },
  lightShadow: {
    boxShadow: Shadows.soft,
  },
  label: {
    fontFamily: Fonts.semibold,
    fontSize: 12,
    lineHeight: 16,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  labelLight: {
    fontSize: 12.5,
    lineHeight: 17,
    color: Colors.textSoft,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.95 }],
  },
  disabled: {
    opacity: 0.45,
    boxShadow: 'none',
  },
  disabledLight: {
    opacity: 0.8,
  },
});
