import { Image, type ImageSource } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

export type CareCard = {
  id: string;
  /** Photos: Pexels (free to use), cropped in assets/images/home. */
  image: ImageSource;
  /** A small label at the top, e.g. "0.4 km away". */
  tag: string;
  title: string;
  caption: string;
  action: string;
  onPress: () => void;
};

const GAP = Spacing.three - 4;
const HEIGHT = 196;

/**
 * "Care for you" on Home: photo cards for the services, scrolling sideways one at a time with
 * the next one peeking in. Each photo fades to ink at the bottom so the white text reads.
 */
export function CareCarousel({ cards }: { cards: CareCard[] }) {
  const { width } = useWindowDimensions();
  // Most of the screen, leaving the next card peeking in; capped on wide screens.
  const cardWidth = Math.min(Math.round(width * 0.78), 320);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={cardWidth + GAP}
      decelerationRate="fast"
      style={styles.scroller}
      contentContainerStyle={styles.row}>
      {cards.map((card) => (
        <Pressable
          key={card.id}
          onPress={card.onPress}
          accessibilityRole="button"
          accessibilityLabel={`${card.title}. ${card.caption}. ${card.action}`}
          style={({ pressed }) => [{ width: cardWidth }, pressed && styles.pressed]}>
          {/* A plain View rounds and clips; the photo and its fade are layers inside it. */}
          <View style={styles.card}>
            <Image
              source={card.image}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={200}
              accessibilityIgnoresInvertColors
            />
            <LinearGradient
              colors={['rgba(8, 25, 31, 0)', 'rgba(8, 25, 31, 0.35)', 'rgba(8, 25, 31, 0.9)']}
              locations={[0.2, 0.5, 1]}
              style={StyleSheet.absoluteFill}
            />

            <View style={styles.tag}>
              <ThemedText style={styles.tagText}>{card.tag}</ThemedText>
            </View>

            <View style={styles.body}>
              <ThemedText style={styles.title} numberOfLines={1}>
                {card.title}
              </ThemedText>
              <ThemedText type="caption" style={styles.caption} numberOfLines={1}>
                {card.caption}
              </ThemedText>
              <View style={styles.action}>
                <ThemedText style={styles.actionText}>{card.action}</ThemedText>
                <ArrowRight size={14} color={Colors.ink} strokeWidth={2.6} />
              </View>
            </View>
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Bleed to the screen edges so cards scroll under the page padding.
  scroller: {
    marginHorizontal: -Spacing.three,
  },
  row: {
    gap: GAP,
    paddingHorizontal: Spacing.three,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  card: {
    height: HEIGHT,
    justifyContent: 'space-between',
    padding: Spacing.three,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    backgroundColor: Colors.ink,
  },
  tag: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(8, 25, 31, 0.45)',
  },
  tagText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    lineHeight: 14,
    color: Colors.onInk,
  },
  body: {
    gap: 2,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 19,
    lineHeight: 24,
    color: Colors.onInk,
  },
  caption: {
    color: 'rgba(255, 255, 255, 0.82)',
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    marginTop: Spacing.two + 2,
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: Radius.pill,
    backgroundColor: Colors.backgroundElement,
  },
  actionText: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    lineHeight: 17,
    color: Colors.ink,
  },
});
