import { createContext, useContext, useEffect, type ReactNode } from 'react';
import {
  StyleSheet,
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';

const PULSE_MS = 850;
const DIMMEST = 0.45;

/**
 * The opacity every placeholder in a `SkeletonGroup` follows, so a loading screen runs one
 * animation however many grey blocks it has, and they all breathe together.
 */
const PulseContext = createContext<SharedValue<number> | null>(null);

/** Starts a soft breathing loop on `pulse`, unless the system asks for reduced motion. */
function usePulseLoop(pulse: SharedValue<number>, enabled: boolean) {
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    if (!enabled || reduceMotion) return;
    pulse.set(
      withRepeat(
        withTiming(DIMMEST, { duration: PULSE_MS, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      ),
    );
    return () => cancelAnimation(pulse);
  }, [pulse, enabled, reduceMotion]);
}

type SkeletonProps = {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * A grey placeholder in the shape of content that is still loading, gently breathing. Inside a
 * `SkeletonGroup` it follows the group's pulse; on its own it runs its own.
 */
export function Skeleton({ width = '100%', height = 14, radius = Radius.sm, style }: SkeletonProps) {
  const group = useContext(PulseContext);
  const own = useSharedValue(1);
  usePulseLoop(own, !group);
  const pulse = group ?? own;
  const breathe = useAnimatedStyle(() => ({ opacity: pulse.get() }));

  return (
    <Animated.View style={[styles.block, { width, height, borderRadius: radius }, style, breathe]} />
  );
}

export function SkeletonCircle({ size = 40, style }: { size?: number; style?: StyleProp<ViewStyle> }) {
  return <Skeleton width={size} height={size} radius={size / 2} style={style} />;
}

/** Lines of placeholder text; the last one is shorter, like the end of a paragraph. */
export function SkeletonText({
  lines = 2,
  lineHeight = 12,
  lastWidth = '60%',
  gap = 8,
}: {
  lines?: number;
  lineHeight?: number;
  lastWidth?: DimensionValue;
  gap?: number;
}) {
  return (
    <View style={{ gap }}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          height={lineHeight}
          width={i === lines - 1 && lines > 1 ? lastWidth : '100%'}
        />
      ))}
    </View>
  );
}

/**
 * Wraps placeholders so screen readers hear "Loading" once instead of every grey block. Use it
 * as the outermost element of a loading layout.
 */
export function SkeletonGroup({
  label = 'Loading',
  style,
  children,
}: {
  label?: string;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const pulse = useSharedValue(1);
  usePulseLoop(pulse, true);

  return (
    <PulseContext.Provider value={pulse}>
      <View
        style={style}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={label}
        accessibilityState={{ busy: true }}>
        {children}
      </View>
    </PulseContext.Provider>
  );
}

type SkeletonListProps = {
  /** How many rows to draw. */
  rows?: number;
  /** The leading shape: a round avatar, a rounded icon tile, or nothing. */
  leading?: 'circle' | 'tile' | 'none';
  /** A small trailing pill, like a tag or button. */
  trailing?: boolean;
  label?: string;
  style?: StyleProp<ViewStyle>;
};

/** A card of list rows while they load: the stand-in for consults, family, doctors, doses. */
export function SkeletonList({
  rows = 3,
  leading = 'circle',
  trailing = true,
  label,
  style,
}: SkeletonListProps) {
  return (
    <SkeletonGroup label={label} style={[styles.card, style]}>
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} style={[styles.row, i > 0 && styles.divider]}>
          {leading === 'circle' ? <SkeletonCircle size={42} /> : null}
          {leading === 'tile' ? <Skeleton width={42} height={42} radius={Radius.md} /> : null}
          <View style={styles.rowText}>
            <Skeleton height={13} width={i % 2 ? '55%' : '70%'} />
            <Skeleton height={10} width={i % 2 ? '80%' : '45%'} />
          </View>
          {trailing ? <Skeleton width={56} height={24} radius={Radius.pill} /> : null}
        </View>
      ))}
    </SkeletonGroup>
  );
}

/** A plain card-shaped placeholder of a given height, for a single card still loading. */
export function SkeletonCard({
  height = 120,
  label,
  style,
}: {
  height?: number;
  label?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <SkeletonGroup label={label} style={[styles.card, styles.cardPad, style]}>
      <View style={styles.cardTop}>
        <Skeleton width={42} height={42} radius={Radius.md} />
        <View style={styles.rowText}>
          <Skeleton height={13} width="60%" />
          <Skeleton height={10} width="40%" />
        </View>
      </View>
      <Skeleton height={Math.max(height - 74, 12)} radius={Radius.md} />
    </SkeletonGroup>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: Colors.skeleton,
  },
  card: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radius.lg + 4,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
    boxShadow: Shadows.card,
  },
  cardPad: {
    gap: Spacing.three,
    paddingVertical: Spacing.three,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
    paddingVertical: 14,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  rowText: {
    flex: 1,
    gap: 8,
  },
});
