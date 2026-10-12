import { useIsFocused } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Spacing } from '@/constants/theme';

type HomeSectionProps = {
  title?: string;
  /** Quiet text at the right of the title, e.g. today's date. Ignored when there is an action. */
  meta?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Position on the page, so sections fade in one after another. */
  index?: number;
  children: ReactNode;
};

/**
 * A titled block on Home that eases in when the screen first opens. A screen mounted out of
 * sight (Care, under a medicine form opened from Home) skips the animation nobody would see.
 */
export function HomeSection({
  title,
  meta,
  actionLabel,
  onAction,
  index = 0,
  children,
}: HomeSectionProps) {
  const focused = useIsFocused();
  // Decided once, when the section first mounts.
  const [animate] = useState(focused);

  return (
    <Animated.View
      entering={animate ? FadeInDown.duration(450).delay(80 + index * 70) : undefined}
      style={styles.section}>
      {title ? (
        <View style={styles.header}>
          <ThemedText style={styles.title} accessibilityRole="header">
            {title}
          </ThemedText>
          {actionLabel ? (
            <Pressable
              onPress={onAction}
              accessibilityRole="button"
              hitSlop={8}
              style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
              <ThemedText type="smallBold" themeColor="primary">
                {actionLabel}
              </ThemedText>
              <ChevronRight size={16} color={Colors.primary} strokeWidth={2.4} />
            </Pressable>
          ) : meta ? (
            <ThemedText type="small" themeColor="textMuted">
              {meta}
            </ThemedText>
          ) : null}
        </View>
      ) : null}
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.three - 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 19,
    lineHeight: 24,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  pressed: {
    opacity: 0.6,
  },
});
