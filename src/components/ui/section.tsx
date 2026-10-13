import { useIsFocused } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Spacing } from '@/constants/theme';

type SectionProps = {
  title?: string;
  /** A quiet line under the title: where the numbers come from, e.g. "Arc pod · 28 Sep". */
  caption?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Position on the page, so sections ease in one after another. */
  index?: number;
  children: ReactNode;
};

/**
 * A titled block on the light redesign (Home first): a calm heading, an optional source line and
 * a "See all" link. Eases in when the screen first opens; a screen mounted out of sight skips the
 * animation nobody would see.
 */
export function Section({
  title,
  caption,
  actionLabel,
  onAction,
  index = 0,
  children,
}: SectionProps) {
  const focused = useIsFocused();
  // Decided once, when the section first mounts.
  const [animate] = useState(focused);

  return (
    <Animated.View
      entering={animate ? FadeInDown.duration(420).delay(60 + index * 60) : undefined}
      style={styles.section}>
      {title ? (
        <View style={styles.header}>
          <View style={styles.titles}>
            <ThemedText style={styles.title} accessibilityRole="header" numberOfLines={1}>
              {title}
            </ThemedText>
            {caption ? (
              <ThemedText style={styles.caption} numberOfLines={1}>
                {caption}
              </ThemedText>
            ) : null}
          </View>
          {actionLabel ? (
            <Pressable
              onPress={onAction}
              accessibilityRole="button"
              hitSlop={10}
              style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
              <ThemedText style={styles.actionText}>{actionLabel}</ThemedText>
              <ChevronRight size={15} color={Colors.primaryDeep} strokeWidth={2.4} />
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.three - 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  titles: {
    flexShrink: 1,
    gap: 1,
  },
  title: {
    fontFamily: Fonts.displaySemibold,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.3,
    color: Colors.text,
  },
  caption: {
    fontFamily: Fonts.medium,
    fontSize: 12.5,
    lineHeight: 17,
    color: Colors.textMuted,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
    paddingBottom: 3,
  },
  actionText: {
    fontFamily: Fonts.semibold,
    fontSize: 14,
    lineHeight: 18,
    color: Colors.primaryDeep,
  },
  pressed: {
    opacity: 0.6,
  },
});
