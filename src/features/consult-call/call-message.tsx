import { LinearGradient } from 'expo-linear-gradient';
import { type LucideIcon } from 'lucide-react-native';
import { type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Glass } from '@/components/ui/glass';
import { IconTile } from '@/components/ui/icon-tile';
import { PageBackground } from '@/components/ui/morning-light';
import { Colors, Fonts, Glass as GlassTokens, Gradients, Gutter, Spacing } from '@/constants/theme';

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
 * A full-screen note around the call (joining, left, ended, or can't join): a pane of glass on the
 * lit page, its buttons below. The call itself is dark; everything before and after it looks like
 * the rest of the app.
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
          <Glass style={styles.note}>
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
          </Glass>
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
  // No fill of its own: the page's light shows through the glass.
  root: {
    flex: 1,
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
    justifyContent: 'center',
    paddingBottom: Spacing.four,
  },
  note: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.five,
    paddingBottom: Spacing.five - 4,
    paddingHorizontal: Spacing.four,
  },
  dishShadow: {
    marginBottom: Spacing.three - 4,
    borderRadius: DISH / 2,
    boxShadow: GlassTokens.shadowSmall,
  },
  // IconTile's round of glass: a bright rim and the faint edge line.
  dish: {
    width: DISH,
    height: DISH,
    borderRadius: DISH / 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: GlassTokens.rim,
    boxShadow: GlassTokens.shadowFlat,
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
