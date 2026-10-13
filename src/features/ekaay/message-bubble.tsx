import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { EkaayMark } from '@/components/ui/ekaay-mark';
import { TrendChart } from '@/components/ui/trend-chart';
import { Colors, Fonts, Radius, Shadows, Spacing } from '@/constants/theme';

import { type ChatMessage } from './sample-data';

export function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.from === 'user') {
    return (
      <View style={[styles.bubble, styles.user]}>
        <ThemedText style={styles.text} themeColor="onInk">
          {message.text}
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.ekaayRow}>
      <EkaayMark size={28} style={styles.avatar} />
      {/* A chart needs a known width, so those bubbles take the full bubble width. */}
      <View style={[styles.bubble, styles.ekaay, message.chart && styles.wide]}>
        <ThemedText style={styles.text}>{message.text}</ThemedText>

        {message.chart ? (
          <View style={styles.chart}>
            <ThemedText type="caption" themeColor="textSecondary">
              {message.chart.caption}
            </ThemedText>
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
                style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
                <ThemedText type="smallBold" themeColor="primary">
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
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  user: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 6,
    backgroundColor: Colors.ink,
    boxShadow: '0 6px 16px rgba(14, 42, 51, 0.18)',
  },
  ekaayRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  avatar: {
    marginTop: 2,
  },
  ekaay: {
    flexShrink: 1,
    alignSelf: 'flex-start',
    gap: Spacing.two + 2,
    borderTopLeftRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
    boxShadow: Shadows.card,
  },
  wide: {
    flex: 1,
  },
  text: {
    fontFamily: Fonts.medium,
    fontSize: 15,
    lineHeight: 22,
  },
  chart: {
    gap: Spacing.one,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  action: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primarySoft,
  },
  pressed: {
    opacity: 0.7,
  },
});
