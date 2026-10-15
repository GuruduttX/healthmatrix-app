import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight } from 'lucide-react-native';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  RadialGradient,
  Stop,
  LinearGradient as SvgLinearGradient,
} from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Glass, type Orb } from '@/components/ui/glass';
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

/** A peach sphere behind the doctors' side, a blue one low behind the words, both peeking out. */
const ORBS: Orb[] = [
  { x: 1, y: 0.24, r: 30, tone: 'peach' },
  { x: 0, y: 0.8, r: 22, tone: 'sky' },
];

/** Where the light gathers behind the doctors, from the card's right edge and top. */
const HALO = { fromRight: 82, y: 76 };

/**
 * Light inside the glass: sky blue rising from the bottom left under the words, warm peach behind
 * the doctors, and a frosted disc with a ring around them.
 */
function Backdrop({ width }: { width: number }) {
  const cx = width - HALO.fromRight;
  return (
    <Svg width={width} height={HEIGHT} style={styles.backdrop} pointerEvents="none">
      <Defs>
        <RadialGradient id="banner-sky" cx={0} cy={HEIGHT} r={190} gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#C9E1F4" stopOpacity={0.9} />
          <Stop offset="0.55" stopColor="#C9E1F4" stopOpacity={0.35} />
          <Stop offset="1" stopColor="#C9E1F4" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient
          id="banner-peach"
          cx={cx}
          cy={HALO.y}
          r={140}
          gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#FFD6BC" stopOpacity={0.72} />
          <Stop offset="0.55" stopColor="#FFD6BC" stopOpacity={0.3} />
          <Stop offset="1" stopColor="#FFD6BC" stopOpacity={0} />
        </RadialGradient>
        <SvgLinearGradient id="banner-disc" x1="0.2" y1="0" x2="0.8" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.7} />
          <Stop offset="1" stopColor="#FFE3D1" stopOpacity={0.35} />
        </SvgLinearGradient>
      </Defs>
      <Circle cx={0} cy={HEIGHT} r={190} fill="url(#banner-sky)" />
      <Circle cx={cx} cy={HALO.y} r={140} fill="url(#banner-peach)" />
      <Circle
        cx={cx}
        cy={HALO.y}
        r={92}
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity={0.75}
        strokeWidth={1}
      />
      <Circle
        cx={cx}
        cy={HALO.y}
        r={62}
        fill="url(#banner-disc)"
        stroke="#FFFFFF"
        strokeOpacity={0.95}
        strokeWidth={1.2}
      />
    </Svg>
  );
}

/**
 * Home's banner under the quick actions, and the way into Ekaay: two real doctors on a pane of
 * glass lit sky blue and peach, with glass spheres peeking past its edges. The whole card is the
 * button; its one orange is the button inside it.
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
      <Glass style={styles.card} orbs={ORBS} tinted={false}>
        <Backdrop width={card} />

        <Image
          source={DOCTORS.source}
          style={[styles.doctors, { width: DOCTORS.width * scale, height: DOCTORS.height * scale }]}
          contentFit="contain"
          accessible={false}
          accessibilityIgnoresInvertColors
        />

        <View style={styles.copy}>
          <View style={styles.words}>
            <ThemedText style={styles.headline}>
              Your health,{'\n'}
              <ThemedText style={[styles.headline, styles.accent]}>our priority</ThemedText>
            </ThemedText>
            <ThemedText style={styles.lede}>Personalised care for a healthier, happier you.</ThemedText>
          </View>
          {/* The shadow sits outside; a plain View rounds and clips the button's gradient. */}
          <View style={styles.ctaLift}>
            <View style={styles.cta}>
              <LinearGradient
                colors={['#D84A08', '#BF3800']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <ThemedText style={styles.ctaText}>Talk to Ekaay</ThemedText>
              <View style={styles.ctaArrow}>
                <ArrowRight size={14} color={Colors.primaryDeep} strokeWidth={2.8} />
              </View>
            </View>
          </View>
        </View>
      </Glass>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    transform: [{ scale: 0.985 }],
  },
  card: {
    height: HEIGHT,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
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
    paddingTop: 16,
    paddingBottom: 16,
    paddingLeft: 18,
  },
  words: {
    gap: 5,
  },
  headline: {
    fontFamily: Fonts.display,
    fontSize: 22,
    lineHeight: 25,
    letterSpacing: -0.6,
    color: Colors.text,
  },
  accent: {
    color: Colors.primaryDeep,
  },
  lede: {
    maxWidth: 170,
    fontFamily: Fonts.medium,
    fontSize: 12.5,
    lineHeight: 17,
    color: Colors.textSoft,
  },
  ctaLift: {
    alignSelf: 'flex-start',
    borderRadius: Radius.pill,
    boxShadow: '0 2px 4px rgba(150, 46, 0, 0.14), 0 8px 18px rgba(190, 70, 10, 0.22)',
  },
  // White on the gradient is 4.9:1 to 5.4:1.
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 36,
    paddingLeft: 15,
    paddingRight: 6,
    borderRadius: Radius.pill,
    overflow: 'hidden',
    boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.35)',
  },
  ctaText: {
    fontFamily: Fonts.bold,
    fontSize: 13.5,
    lineHeight: 18,
    color: Colors.onInk,
  },
  ctaArrow: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundElement,
  },
});
