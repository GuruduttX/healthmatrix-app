import { CloudOff, RotateCw, type LucideIcon } from 'lucide-react-native';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Radius, Shadows, Spacing } from '@/constants/theme';

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
 * What a list or screen shows when it has nothing yet: an icon in a round dish on a soft halo, a
 * line on what goes here, and the one thing to do next.
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
  const { color } = TONES[tone];

  return (
    <View style={[styles.wrap, card && styles.card, style]}>
      <View style={styles.halo}>
        <View style={styles.icon}>
          <Icon size={24} color={color} strokeWidth={2} />
        </View>
      </View>
      <View style={styles.text}>
        <ThemedText style={[styles.title, styles.center]}>{title}</ThemedText>
        {body ? <ThemedText style={[styles.body, styles.center]}>{body}</ThemedText> : null}
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
      <View style={[styles.halo, styles.haloAlert]}>
        <View style={styles.icon}>
          <CloudOff size={24} color={Colors.high} strokeWidth={2} />
        </View>
      </View>
      <View style={styles.text}>
        <ThemedText style={[styles.title, styles.center]}>{title}</ThemedText>
        <ThemedText style={[styles.body, styles.center]}>{message}</ThemedText>
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
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.hairline,
    backgroundColor: Colors.backgroundElement,
    boxShadow: Shadows.soft,
  },
  // A warm halo around a white dish, lifted like Home's quick actions.
  halo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.well,
  },
  haloAlert: {
    backgroundColor: Colors.highSoft,
  },
  icon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundElement,
    boxShadow: Shadows.dish,
  },
  text: {
    gap: 4,
    maxWidth: 320,
  },
  title: {
    fontFamily: Fonts.displaySemibold,
    fontSize: 17.5,
    lineHeight: 23,
    letterSpacing: -0.2,
    color: Colors.text,
  },
  body: {
    fontFamily: Fonts.medium,
    fontSize: 13.5,
    lineHeight: 19,
    color: Colors.textSoft,
  },
  center: {
    textAlign: 'center',
  },
});
