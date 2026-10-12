import { CloudOff, RotateCw, type LucideIcon } from 'lucide-react-native';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';

import { Button } from './button';
import { TONES, type Tone } from './icon-tile';

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  body?: string;
  tone?: Tone;
  action?: { label: string; icon?: LucideIcon; onPress: () => void };
  /** Draws it on a white card; leave off when it already sits inside one. */
  card?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * What a list or screen shows when it has nothing yet: an icon on soft rings, a line on what
 * goes here, and the one thing to do next.
 */
export function EmptyState({
  icon: Icon,
  title,
  body,
  tone = 'primary',
  action,
  card = true,
  style,
}: EmptyStateProps) {
  const { color, soft } = TONES[tone];

  return (
    <View style={[styles.wrap, card && styles.card, style]}>
      <View style={[styles.halo, { backgroundColor: soft }]}>
        <View style={[styles.icon, { borderColor: soft }]}>
          <Icon size={24} color={color} strokeWidth={2} />
        </View>
      </View>
      <View style={styles.text}>
        <ThemedText type="bodyBold" style={styles.center}>
          {title}
        </ThemedText>
        {body ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
            {body}
          </ThemedText>
        ) : null}
      </View>
      {action ? (
        <Button label={action.label} icon={action.icon} onPress={action.onPress} size="sm" />
      ) : null}
    </View>
  );
}

type ErrorStateProps = {
  /** What went wrong, in words a member can act on. */
  message: string;
  title?: string;
  onRetry?: () => void;
  card?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** A load that failed: what happened, and Try again. */
export function ErrorState({
  message,
  title = 'Couldn’t load this',
  onRetry,
  card = true,
  style,
}: ErrorStateProps) {
  return (
    <View style={[styles.wrap, card && styles.card, style]} accessibilityRole="alert">
      <View style={[styles.halo, { backgroundColor: Colors.dangerSoft }]}>
        <View style={[styles.icon, { borderColor: Colors.dangerSoft }]}>
          <CloudOff size={24} color={Colors.danger} strokeWidth={2} />
        </View>
      </View>
      <View style={styles.text}>
        <ThemedText type="bodyBold" style={styles.center}>
          {title}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
          {message}
        </ThemedText>
      </View>
      {onRetry ? (
        <Button label="Try again" icon={RotateCw} variant="secondary" size="sm" onPress={onRetry} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: Spacing.three - 2,
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.four,
  },
  card: {
    borderRadius: Radius.lg + 4,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
    boxShadow: Shadows.card,
  },
  halo: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    backgroundColor: Colors.backgroundElement,
  },
  text: {
    gap: 4,
    maxWidth: 320,
  },
  center: {
    textAlign: 'center',
  },
});
