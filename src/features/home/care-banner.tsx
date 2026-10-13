import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight } from 'lucide-react-native';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, MaxContentWidth, Radius } from '@/constants/theme';

import { GUTTER } from './layout';

const HEIGHT = 160;
/**
 * Two doctors, from an AI-generated image the team supplied (see assets/images/home/CREDITS),
 * cleaned up with a soft shadow baked in on the left and top. Its right and bottom edges are flush:
 * the man's coat is cut there, as the card's edges cut it.
 */
const DOCTORS = {
  source: require('@/assets/images/home/banner-doctors.png'),
  width: 504,
  height: 496,
  /** The people's height in the file, below the shadow's room at the top. */
  figure: 472,
};
/** The words take this much of the card's left; the doctors fit in the rest, within these sizes. */
const WORDS_WIDTH = 194;
const TALLEST = 156;
const SHORTEST = 120;

/**
 * Warm orange under the words (white text on it is 4.1:1 to 4.5:1, and the headline is large),
 * brightening to apricot behind the doctors, where the light falls.
 */
const BASE = ['#D04A0E', '#D65212', '#EC7838', '#F9AF7E'] as const;

/**
 * Light and shape behind the art: a soft glow around the doctors with two faint rings, a warm
 * rise of land under them, and a darker wave low on the left that gives the card depth.
 */
function Backdrop() {
  return (
    <>
      <Svg width={360} height={HEIGHT} style={styles.left}>
        <Path
          d={`M0 118 C70 96 130 150 214 138 C282 128 318 156 360 ${HEIGHT} L0 ${HEIGHT} Z`}
          fill="rgba(255, 255, 255, 0.07)"
        />
        <Path
          d={`M0 150 C64 132 150 168 238 ${HEIGHT} L0 ${HEIGHT} Z`}
          fill="rgba(140, 40, 0, 0.1)"
        />
      </Svg>
      <Svg width={250} height={HEIGHT} style={styles.right}>
        <Defs>
          <RadialGradient id="glow" cx="160" cy="84" r="118" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.42" />
            <Stop offset="0.55" stopColor="#FFFFFF" stopOpacity="0.12" />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx="160" cy="84" r="118" fill="url(#glow)" />
        <Circle cx="160" cy="84" r="64" stroke="#FFFFFF" strokeOpacity="0.16" fill="none" />
        <Circle cx="160" cy="84" r="96" stroke="#FFFFFF" strokeOpacity="0.1" fill="none" />
        <Path
          d={`M40 ${HEIGHT} C64 140 118 124 168 128 C214 132 238 150 250 160 L250 ${HEIGHT} Z`}
          fill="rgba(255, 214, 186, 0.22)"
        />
      </Svg>
    </>
  );
}

/**
 * Home's banner under the quick actions: two real doctors on a warm orange card, and the way into
 * Ekaay. The whole card is the button. Flat on the page: no rim, no shadow.
 */
export function CareBanner({ onPress }: { onPress: () => void }) {
  const { width } = useWindowDimensions();
  const card = Math.min(width, MaxContentWidth) - GUTTER * 2;
  // As tall as fits beside the words: smaller on a narrow phone, never into the text.
  const tall = Math.min(Math.max(card - WORDS_WIDTH, SHORTEST), TALLEST);
  const scale = tall / DOCTORS.figure;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Your health, our priority. Talk to Ekaay"
      accessibilityHint="Personalised care for a healthier, happier you"
      style={({ pressed }) => pressed && styles.pressed}>
      {/* A plain View rounds and clips the card and its art. */}
      <View style={styles.card}>
        <LinearGradient
          colors={BASE}
          locations={[0, 0.5, 0.78, 1]}
          start={{ x: 0, y: 0.3 }}
          end={{ x: 1, y: 0.7 }}
          style={StyleSheet.absoluteFill}
        />
        <Backdrop />
        {/* A gloss along the top edge, like light on a raised surface. */}
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0)']}
          locations={[0, 0.5]}
          style={StyleSheet.absoluteFill}
        />

        <Image
          source={DOCTORS.source}
          style={[styles.doctors, { width: DOCTORS.width * scale, height: DOCTORS.height * scale }]}
          contentFit="contain"
          accessible={false}
          accessibilityIgnoresInvertColors
        />

        <View style={styles.copy}>
          <View style={styles.words}>
            <ThemedText style={styles.headline}>Your health,{'\n'}our priority</ThemedText>
            <ThemedText style={styles.lede}>Personalised care for a healthier, happier you.</ThemedText>
          </View>
          <View style={styles.cta}>
            <ThemedText style={styles.ctaText}>Talk to Ekaay</ThemedText>
            <View style={styles.ctaArrow}>
              <ArrowRight size={15} color={Colors.onInk} strokeWidth={2.6} />
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    transform: [{ scale: 0.985 }],
  },
  card: {
    height: HEIGHT,
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  left: {
    position: 'absolute',
    left: 0,
    bottom: 0,
  },
  right: {
    position: 'absolute',
    right: 0,
    bottom: 0,
  },
  // Cut by the card's right and bottom edges, so the coats run on past them; set low, so the
  // card's bottom edge cuts them above the belt.
  doctors: {
    position: 'absolute',
    right: 0,
    bottom: -16,
  },
  copy: {
    flex: 1,
    justifyContent: 'space-between',
    maxWidth: 212,
    paddingTop: 15,
    paddingBottom: 15,
    paddingLeft: 18,
  },
  words: {
    gap: 4,
  },
  headline: {
    fontFamily: Fonts.display,
    fontSize: 22,
    lineHeight: 25,
    letterSpacing: -0.6,
    color: Colors.onInk,
    textShadowColor: 'rgba(110, 28, 0, 0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  lede: {
    maxWidth: 176,
    fontFamily: Fonts.medium,
    fontSize: 12.5,
    lineHeight: 17,
    color: 'rgba(255, 255, 255, 0.94)',
  },
  cta: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 36,
    paddingLeft: 14,
    paddingRight: 6,
    borderRadius: Radius.pill,
    backgroundColor: Colors.backgroundElement,
    boxShadow: '0 4px 12px rgba(110, 30, 0, 0.22)',
  },
  ctaText: {
    fontFamily: Fonts.bold,
    fontSize: 13.5,
    lineHeight: 18,
    color: Colors.primaryDeep,
  },
  ctaArrow: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryDeep,
  },
});
