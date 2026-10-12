import { type LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts } from '@/constants/theme';

type CallControlProps = {
  icon: LucideIcon;
  /** Shown under the button and read by screen readers. */
  label: string;
  onPress: () => void;
  /** `off` is a muted mic or a stopped camera: a white button, so it stands out. */
  tone?: 'on' | 'off' | 'end';
  size?: number;
  disabled?: boolean;
};

const TONES = {
  on: { background: 'rgba(255, 255, 255, 0.16)', icon: Colors.onInk },
  off: { background: Colors.onInk, icon: Colors.ink },
  end: { background: '#E5372B', icon: Colors.onInk },
} as const;

/** A round button in the call's control bar, with its label underneath. */
export function CallControl({
  icon: Icon,
  label,
  onPress,
  tone = 'on',
  size = 58,
  disabled,
}: CallControlProps) {
  const colors = TONES[tone];
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
          pressed && styles.pressed,
          disabled && styles.disabled,
        ]}>
        <Icon size={size * 0.4} color={colors.icon} strokeWidth={2.2} />
      </Pressable>
      <ThemedText style={styles.label} numberOfLines={1}>
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
  label: {
    fontFamily: Fonts.semibold,
    fontSize: 12,
    lineHeight: 16,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.95 }],
  },
  disabled: {
    opacity: 0.5,
  },
});
