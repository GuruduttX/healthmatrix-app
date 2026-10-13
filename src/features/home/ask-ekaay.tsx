import { Mic } from 'lucide-react-native';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { EkaayMark } from '@/components/ui/ekaay-mark';
import { Colors, Fonts, Radius, Shadows, Spacing } from '@/constants/theme';

type AskEkaayProps = {
  /** Questions to start from, one tap each. */
  suggestions?: string[];
  /** Opens Ekaay, asking `question` when one was tapped. */
  onAsk: (question?: string) => void;
};

/**
 * Ekaay's mark, the app icon in small, with a soft halo that slowly breathes so the assistant
 * feels present. Still when the system asks for reduced motion.
 */
function EkaayBadge() {
  const reduceMotion = useReducedMotion();
  const breath = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    breath.set(
      withRepeat(withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }), -1, true),
    );
    return () => cancelAnimation(breath);
  }, [breath, reduceMotion]);

  const halo = useAnimatedStyle(() => ({
    opacity: 0.9 - breath.get() * 0.55,
    transform: [{ scale: 1 + breath.get() * 0.18 }],
  }));

  return (
    <View>
      <Animated.View style={[styles.halo, halo]} />
      <EkaayMark size={BADGE} shape="square" />
    </View>
  );
}

/** The way into Ekaay from Home: a search-like bar, and a few questions to start from. */
export function AskEkaay({ suggestions = [], onAsk }: AskEkaayProps) {
  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => onAsk()}
        accessibilityRole="button"
        accessibilityLabel="Ask Ekaay. Answers from your own records"
        style={({ pressed }) => [styles.bar, pressed && styles.barPressed]}>
        <EkaayBadge />
        <View style={styles.flex}>
          <ThemedText style={styles.prompt} numberOfLines={1}>
            Ask Ekaay anything
          </ThemedText>
          <ThemedText style={styles.hint} numberOfLines={1}>
            Answers from your own records
          </ThemedText>
        </View>
        <View style={styles.mic}>
          <Mic size={18} color={Colors.textSoft} strokeWidth={2} />
        </View>
      </Pressable>

      {suggestions.length ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.scroller}
          contentContainerStyle={styles.suggestions}>
          {suggestions.map((question) => (
            <Pressable
              key={question}
              onPress={() => onAsk(question)}
              accessibilityRole="button"
              accessibilityLabel={`Ask Ekaay: ${question}`}
              style={({ pressed }) => [styles.suggestion, pressed && styles.pressed]}>
              <ThemedText style={styles.suggestionText} numberOfLines={1}>
                {question}
              </ThemedText>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

const BADGE = 38;

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.two + 2,
  },
  flex: {
    flex: 1,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
    minHeight: 62,
    paddingVertical: 10,
    paddingLeft: 11,
    paddingRight: 11,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.hairline,
    backgroundColor: Colors.backgroundElement,
    boxShadow: Shadows.soft,
  },
  barPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.99 }],
  },
  halo: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 16,
    backgroundColor: Colors.primaryTintStrong,
  },
  prompt: {
    fontFamily: Fonts.semibold,
    fontSize: 15.5,
    lineHeight: 20,
    color: Colors.text,
  },
  hint: {
    fontFamily: Fonts.regular,
    fontSize: 12.5,
    lineHeight: 16,
    color: Colors.textMuted,
  },
  mic: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.canvas,
  },
  // Let the chips run to the screen edges while the first lines up with the page.
  // Within the page's edges like every other section; the chips scroll inside them.
  scroller: {
    flexGrow: 0,
  },
  suggestions: {
    gap: Spacing.two,
  },
  suggestion: {
    paddingVertical: 8,
    paddingHorizontal: 13,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.hairline,
    backgroundColor: Colors.backgroundElement,
  },
  suggestionText: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    lineHeight: 17,
    color: Colors.textSecondary,
  },
  pressed: {
    opacity: 0.7,
  },
});
