import { useIsFocused } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Spacing } from '@/constants/theme';

type HeaderProps = {
  title: string;
  /** A quiet line under the title: where the numbers come from, e.g. "Arc pod · 28 Sep". */
  caption?: string;
  /** Quiet text at the right, e.g. a count or a date. Ignored when there is an action. */
  meta?: string;
  actionLabel?: string;
  onAction?: () => void;
};

type SectionProps = Partial<HeaderProps> & {
  /** Position on the page, so sections ease in one after another. */
  index?: number;
  children: ReactNode;
};

/** A section's heading on its own: a calm title, an optional source line, a link or a count. */
export function SectionTitle({ title, caption, meta, actionLabel, onAction }: HeaderProps) {
  return (
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
      ) : meta ? (
        <ThemedText style={styles.meta} numberOfLines={1}>
          {meta}
        </ThemedText>
      ) : null}
    </View>
  );
}

/**
 * A titled block on the page, as on Home: a calm heading, an optional source line and a "See all"
 * link. Eases in when the screen first opens; a screen mounted out of sight skips the animation
 * nobody would see.
 */
export function Section({
  title,
  caption,
  meta,
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
        <SectionTitle
          title={title}
          caption={caption}
          meta={meta}
          actionLabel={actionLabel}
          onAction={onAction}
        />
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
    color: Colors.textFaint,
  },
  meta: {
    paddingBottom: 3,
    fontFamily: Fonts.semibold,
    fontSize: 13,
    lineHeight: 17,
    color: Colors.textFaint,
  },
  // The chevron's glyph sits inside its box with blank space on the right; pulling the link out by
  // that much puts the visible arrow on the card's edge below, as the title sits on its left edge.
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
    marginRight: -5,
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
