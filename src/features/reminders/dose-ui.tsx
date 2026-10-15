import { Image } from 'expo-image';
import { Check, Undo2 } from 'lucide-react-native';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { glassSurface } from '@/components/ui/glass';
import { Colors, Fonts, Glass } from '@/constants/theme';

// The small pieces the medicine screens share with Home's Today card: a 3D pill in a round dish,
// the orange ring for the day's doses, and the round tick and undo buttons.

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** The dish, the ring and the tick at either end of a dose's line share one size, as on Home. */
export const LEAD = 34;

/** Microsoft Fluent Emoji (MIT), as on Home; see assets/images/home/3d/LICENSE. */
const ART = {
  pill: require('@/assets/images/home/3d/medicine.png'),
  syringe: require('@/assets/images/home/3d/syringe.png'),
};

/** A 3D pill (or syringe) in a small round of glass. Faded for a dose already marked or paused. */
export function MedicineDish({
  art = 'pill',
  size = LEAD,
  faded = false,
}: {
  art?: keyof typeof ART;
  size?: number;
  faded?: boolean;
}) {
  // The syringe fills its square more than the pill, so it sits a touch smaller.
  const image = Math.round(size * (art === 'syringe' ? 0.56 : 0.62));
  const round = { width: size, height: size, borderRadius: size / 2 };
  return (
    <View style={[glassSurface.flat, styles.dish, round]}>
      <Image
        source={ART[art]}
        style={[{ width: image, height: image }, faded && styles.faded]}
        contentFit="contain"
        accessibilityIgnoresInvertColors
        aria-hidden
      />
    </View>
  );
}

/** The day's doses as a share of a circle, filling in when it appears. */
export function DoseRing({ taken, total }: { taken: number; total: number }) {
  const stroke = 3.5;
  const radius = (LEAD - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const fraction = total ? Math.min(taken / total, 1) : 0;
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(reduceMotion ? fraction : 0);

  useEffect(() => {
    progress.set(
      reduceMotion
        ? fraction
        : withTiming(fraction, { duration: 900, easing: Easing.out(Easing.cubic) }),
    );
  }, [fraction, progress, reduceMotion]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.get()),
  }));

  return (
    <View style={styles.lead} aria-hidden>
      <Svg width={LEAD} height={LEAD}>
        <Circle
          cx={LEAD / 2}
          cy={LEAD / 2}
          r={radius}
          stroke={Colors.backgroundSelected}
          strokeWidth={stroke}
          fill="none"
        />
        <AnimatedCircle
          cx={LEAD / 2}
          cy={LEAD / 2}
          r={radius}
          stroke={Colors.primary}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
          fill="none"
          // Start at 12 o'clock instead of 3 o'clock.
          transform={`rotate(-90 ${LEAD / 2} ${LEAD / 2})`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <ThemedText style={styles.ringValue}>
          {taken}
          <ThemedText style={styles.ringTotal}>/{total}</ThemedText>
        </ThemedText>
      </View>
    </View>
  );
}

/**
 * How a tick looks: `solid` orange when the dose is due now, `soft` (a round of glass with a peach
 * ring, like a box waiting for a tick) otherwise, and `done` once taken.
 */
export type TickLook = 'solid' | 'soft' | 'done';

const TICK_COLOR: Record<TickLook, string> = {
  solid: Colors.onInk,
  soft: Colors.primaryDeep,
  done: Colors.onInk,
};

/**
 * Home's round tick. With `onPress` it is a button of its own; without, it only shows the state of
 * a line that is itself the checkbox.
 */
export function TickButton({
  look,
  onPress,
  accessibilityLabel,
}: {
  look: TickLook;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const icon = <Check size={16} color={TICK_COLOR[look]} strokeWidth={3} />;
  if (!onPress) return <View style={[styles.tick, styles[look]]}>{icon}</View>;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={({ pressed }) => [styles.tick, styles[look], pressed && PRESSED[look]]}>
      {icon}
    </Pressable>
  );
}

/** Takes back a dose already marked: a quiet round of glass. */
export function UndoButton({
  onPress,
  accessibilityLabel,
}: {
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={({ pressed }) => [glassSurface.flat, styles.tick, pressed && styles.undoPressed]}>
      <Undo2 size={15} color={Colors.textSoft} strokeWidth={2.3} />
    </Pressable>
  );
}

/** Each look's colour while pressed: a shade deeper. */
const PRESSED = StyleSheet.create({
  solid: { backgroundColor: Colors.primaryInk, transform: [{ scale: 0.97 }] },
  soft: { backgroundColor: Colors.primaryTint, transform: [{ scale: 0.97 }] },
  done: { opacity: 0.8, transform: [{ scale: 0.97 }] },
});

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  lead: {
    width: LEAD,
    height: LEAD,
  },
  dish: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  faded: {
    opacity: 0.5,
  },
  ringValue: {
    fontFamily: Fonts.displaySemibold,
    fontSize: 11.5,
    lineHeight: 14,
    color: Colors.text,
    fontVariant: ['tabular-nums'],
  },
  // Nested in the value, so it sets its own line height (ThemedText's default is 24).
  ringTotal: {
    fontFamily: Fonts.displaySemibold,
    fontSize: 9,
    lineHeight: 14,
    color: Colors.textFaint,
  },
  tick: {
    width: LEAD,
    height: LEAD,
    borderRadius: LEAD / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  solid: {
    backgroundColor: Colors.primaryDeep,
  },
  soft: {
    borderWidth: 1.5,
    borderColor: Colors.primaryLight,
    backgroundColor: Glass.fillSoft,
    boxShadow: Glass.glowSmall,
  },
  done: {
    backgroundColor: Colors.good,
  },
  undoPressed: {
    backgroundColor: Colors.well,
    transform: [{ scale: 0.97 }],
  },
});
