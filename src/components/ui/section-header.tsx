import { ChevronRight } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts } from '@/constants/theme';

type SectionHeaderProps = {
  title: string;
  /** Quiet text at the right, e.g. a count or date. Ignored when there is an action. */
  meta?: string;
  actionLabel?: string;
  onAction?: () => void;
};

/** A section's title, with an optional "See all ›" style link at the right. Matches Home. */
export function SectionHeader({ title, meta, actionLabel, onAction }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <ThemedText style={styles.title} accessibilityRole="header" numberOfLines={1}>
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
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    flexShrink: 1,
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
