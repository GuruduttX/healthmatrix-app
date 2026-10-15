import { router } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { EkaayMark } from '@/components/ui/ekaay-mark';
import { glassSurface } from '@/components/ui/glass';
import { TrendChart } from '@/components/ui/trend-chart';
import { Colors, Fonts, Glass, Radius, Spacing } from '@/constants/theme';

import { type ChatMessage } from './chat';

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
      <View style={[styles.bubble, glassSurface.card, styles.ekaay, message.chart && styles.wide]}>
        {message.pending ? (
          <View style={styles.pending} accessibilityLiveRegion="polite">
            <ActivityIndicator size="small" color={Colors.primary} />
            <ThemedText style={styles.pendingText}>{message.text}</ThemedText>
          </View>
        ) : (
          <ThemedText style={styles.text}>{message.text}</ThemedText>
        )}

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
                style={({ pressed }) => [
                  glassSurface.flat,
                  styles.action,
                  pressed && styles.actionPressed,
                ]}>
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
    boxShadow: Glass.shadowSmall,
  },
  ekaayRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  avatar: {
    marginTop: 2,
    borderRadius: AVATAR / 2,
    boxShadow: Glass.shadowSmall,
  },
  // Ekaay's answers: panes of glass like Home's cards, the corner by the mark cut tight.
  ekaay: {
    flexShrink: 1,
    alignSelf: 'flex-start',
    gap: Spacing.three - 4,
    borderTopLeftRadius: 6,
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
  pending: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  pendingText: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textFaint,
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
  // Compact pills of glass set into the answer: the words carry the orange, never a peach fill.
  action: {
    justifyContent: 'center',
    height: 34,
    paddingHorizontal: 13,
    borderRadius: Radius.pill,
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
