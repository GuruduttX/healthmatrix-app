import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { EkaayMark } from '@/components/ui/ekaay-mark';
import { TrendChart } from '@/components/ui/trend-chart';
import { Colors, Fonts, Radius, Shadows, Spacing } from '@/constants/theme';

import { type ChatMessage } from './sample-data';

/** Ekaay's mark beside its answers. */
const AVATAR = 28;

export function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.from === 'user') {
    // The member's own words: a quiet ink bubble, so a long chat doesn't fill up with orange.
    return (
      <View style={[styles.bubble, styles.user]}>
        <ThemedText style={[styles.text, styles.userText]}>{message.text}</ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.ekaayRow}>
      <View style={styles.avatar}>
        <EkaayMark size={AVATAR} />
      </View>
      {/* A chart needs a known width, so those bubbles take the full bubble width. */}
      <View style={[styles.bubble, styles.ekaay, message.chart && styles.wide]}>
        <ThemedText style={styles.text}>{message.text}</ThemedText>

        {message.chart ? (
          <View style={styles.chart}>
            <ThemedText style={styles.chartCaption}>{message.chart.caption}</ThemedText>
            <TrendChart
              points={message.chart.points}
              normalMax={message.chart.normalMax}
              description={message.chart.description}
            />
          </View>
        ) : null}

        {message.actions ? (
          <View style={styles.actions}>
            {message.actions.map((action) => (
              <Pressable
                key={action.label}
                accessibilityRole="button"
                onPress={action.href ? () => router.navigate(action.href!) : undefined}
                style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}>
                <ThemedText style={styles.actionText} numberOfLines={1}>
                  {action.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    maxWidth: '86%',
    paddingVertical: 12,
    paddingHorizontal: Spacing.three - 2,
    borderRadius: 20,
  },
  user: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 6,
    backgroundColor: Colors.text,
    boxShadow: Shadows.soft,
  },
  ekaayRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  avatar: {
    marginTop: 2,
    borderRadius: AVATAR / 2,
    boxShadow: Shadows.dish,
  },
  // Ekaay's answers: white cards with a hairline, like Home's.
  ekaay: {
    flexShrink: 1,
    alignSelf: 'flex-start',
    gap: Spacing.three - 4,
    borderTopLeftRadius: 6,
    borderWidth: 1,
    borderColor: Colors.hairline,
    backgroundColor: Colors.backgroundElement,
    boxShadow: Shadows.soft,
  },
  wide: {
    flex: 1,
  },
  text: {
    fontFamily: Fonts.medium,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.text,
  },
  userText: {
    color: Colors.onInk,
  },
  chart: {
    gap: Spacing.one,
  },
  chartCaption: {
    fontFamily: Fonts.medium,
    fontSize: 12.5,
    lineHeight: 17,
    color: Colors.textFaint,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  // Compact white pills: the words carry the orange, never a peach fill behind them.
  action: {
    justifyContent: 'center',
    height: 34,
    paddingHorizontal: 13,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.hairline,
    backgroundColor: Colors.backgroundElement,
  },
  actionPressed: {
    backgroundColor: Colors.well,
    transform: [{ scale: 0.97 }],
  },
  actionText: {
    fontFamily: Fonts.bold,
    fontSize: 13.5,
    lineHeight: 18,
    color: Colors.primaryDeep,
  },
});
