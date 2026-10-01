import { type LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, type PressableProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing } from '@/constants/theme';

type ButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  variant?: 'primary' | 'secondary';
  icon?: LucideIcon;
};

export function Button({ label, variant = 'primary', icon: Icon, ...props }: ButtonProps) {
  const textColor = variant === 'primary' ? Colors.onInk : Colors.text;

  return (
    <Pressable
      accessibilityRole="button"
      {...props}
      style={({ pressed }) => [styles.base, styles[variant], pressed && styles.pressed]}>
      {Icon ? <Icon size={16} color={textColor} strokeWidth={2.2} /> : null}
      <ThemedText type="smallBold" style={{ color: textColor }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  primary: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  secondary: {
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
  },
  pressed: {
    opacity: 0.8,
  },
});
