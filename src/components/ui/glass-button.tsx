import { type LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, type PressableProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Radius } from '@/constants/theme';

type GlassButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  label?: string;
  icon?: LucideIcon;
};

/** A see-through pill for actions on a dark header, e.g. Share on the Card tab. */
export function GlassButton({ label, icon: Icon, ...props }: GlassButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={6}
      {...props}
      style={({ pressed }) => [styles.button, !label && styles.iconOnly, pressed && styles.pressed]}>
      {Icon ? <Icon size={16} color={Colors.onInk} strokeWidth={2.3} /> : null}
      {label ? <ThemedText style={styles.label}>{label}</ThemedText> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    backgroundColor: Colors.glass,
  },
  iconOnly: {
    width: 42,
    height: 42,
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  label: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    lineHeight: 18,
    color: Colors.onInk,
  },
  pressed: {
    opacity: 0.7,
  },
});
