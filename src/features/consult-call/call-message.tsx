import { LinearGradient } from 'expo-linear-gradient';
import { type LucideIcon } from 'lucide-react-native';
import { type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { IconTile } from '@/components/ui/icon-tile';
import { PageBackground } from '@/components/ui/morning-light';
import { Colors, Fonts, Gradients, Gutter, Shadows, Spacing } from '@/constants/theme';

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

const DISH = 72;

/**
 * A full-screen note on the warm page, around the call: joining, left, ended, or can't join. The
 * call itself is dark; everything before and after it looks like the rest of the app.
 */
export function CallMessage({
  icon,
  iconTone = 'neutral',
  title,
  children,
  primary,
  secondary,
}: CallMessageProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.root}>
      <PageBackground />
      <View
        style={[
          styles.content,
          { paddingTop: insets.top + Spacing.four, paddingBottom: insets.bottom + Spacing.four },
        ]}>
        <View style={styles.body}>
          <View style={styles.dishShadow}>
            {icon ? (
              <IconTile icon={icon} tone={iconTone} size={DISH} />
            ) : (
              // IconTile's quiet dish, with the spinner on a layer of its own above the tint.
              <View style={styles.dish}>
                <LinearGradient
                  colors={Gradients.dishQuiet}
                  start={{ x: 0.2, y: 0 }}
                  end={{ x: 0.8, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <View style={[StyleSheet.absoluteFill, styles.center]}>
                  <ActivityIndicator color={Colors.primaryDeep} />
                </View>
              </View>
            )}
          </View>
          <ThemedText style={[styles.title, styles.centerText]} accessibilityRole="header">
            {title}
          </ThemedText>
          {children ? (
            <ThemedText style={[styles.text, styles.centerText]}>{children}</ThemedText>
          ) : null}
        </View>
        <View style={styles.actions}>
          {primary ? <Button label={primary.label} onPress={primary.onPress} /> : null}
          {secondary ? (
            <Button label={secondary.label} variant="secondary" onPress={secondary.onPress} />
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.canvas,
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    paddingHorizontal: Gutter,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  dishShadow: {
    marginBottom: Spacing.three - 4,
    borderRadius: DISH / 2,
    boxShadow: Shadows.dish,
  },
  dish: {
    width: DISH,
    height: DISH,
    borderRadius: DISH / 2,
    overflow: 'hidden',
  },
  title: {
    fontFamily: Fonts.displaySemibold,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.4,
    color: Colors.text,
  },
  text: {
    fontFamily: Fonts.medium,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSoft,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerText: {
    textAlign: 'center',
    maxWidth: 340,
  },
  actions: {
    gap: Spacing.three - 4,
  },
});
