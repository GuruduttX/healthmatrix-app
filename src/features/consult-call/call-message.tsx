import { type LucideIcon } from 'lucide-react-native';
import { type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing } from '@/constants/theme';

type Action = { label: string; onPress: () => void };

type CallMessageProps = {
  /** Omitted while busy: a spinner shows instead. */
  icon?: LucideIcon;
  iconTone?: 'success' | 'neutral';
  title: string;
  children?: ReactNode;
  primary?: Action;
  secondary?: Action;
};

/** A full-screen note on the call's dark background: joining, left, ended, or can't join. */
export function CallMessage({
  icon: Icon,
  iconTone = 'neutral',
  title,
  children,
  primary,
  secondary,
}: CallMessageProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingBottom: insets.bottom + Spacing.four }]}>
      <View style={styles.body}>
        <View style={[styles.icon, iconTone === 'success' && styles.iconSuccess]}>
          {Icon ? (
            <Icon
              size={30}
              color={iconTone === 'success' ? Colors.success : Colors.onInk}
              strokeWidth={2.2}
            />
          ) : (
            <ActivityIndicator color={Colors.onInk} />
          )}
        </View>
        <ThemedText type="subtitle" style={[styles.onInk, styles.center]}>
          {title}
        </ThemedText>
        {children ? (
          <ThemedText type="small" style={[styles.muted, styles.center]}>
            {children}
          </ThemedText>
        ) : null}
      </View>
      <View style={styles.actions}>
        {primary ? (
          <Pressable
            onPress={primary.onPress}
            accessibilityRole="button"
            style={({ pressed }) => [styles.button, styles.primary, pressed && styles.pressed]}>
            <ThemedText type="bodyBold" style={styles.onInk}>
              {primary.label}
            </ThemedText>
          </Pressable>
        ) : null}
        {secondary ? (
          <Pressable
            onPress={secondary.onPress}
            accessibilityRole="button"
            style={({ pressed }) => [styles.button, styles.secondary, pressed && styles.pressed]}>
            <ThemedText type="bodyBold" style={styles.onInk}>
              {secondary.label}
            </ThemedText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.ink,
    paddingHorizontal: Spacing.four,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  icon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  iconSuccess: {
    backgroundColor: Colors.successSoft,
  },
  onInk: {
    color: Colors.onInk,
  },
  muted: {
    color: 'rgba(255, 255, 255, 0.75)',
  },
  center: {
    textAlign: 'center',
    maxWidth: 340,
  },
  actions: {
    gap: Spacing.two + 4,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    borderRadius: Radius.lg,
  },
  primary: {
    backgroundColor: Colors.primary,
  },
  secondary: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  pressed: {
    opacity: 0.8,
  },
});
