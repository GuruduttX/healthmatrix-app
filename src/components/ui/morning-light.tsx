import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Colors, Gradients } from '@/constants/theme';

/** The colour at the very top of a page, where the morning light is strongest. */
export const GLOW_TOP = Gradients.morning[0];

/**
 * Warm light behind the top of a page: a pale peach wash fading into the canvas, a touch brighter
 * in the top right. Both are gradient layers that fade out well inside their box, so no edge ever
 * shows. Absolutely placed at the top of its parent; put it first so everything paints above it.
 */
export function MorningLight({
  height = 420,
  style,
}: {
  height?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.light, { height }, style]}>
      <LinearGradient
        colors={Gradients.morning}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(240, 128, 72, 0.14)', 'rgba(240, 128, 72, 0)']}
        locations={[0, 0.5]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

/**
 * The backdrop of a page with a fixed header (a screen opened from a tab, a form): the warm canvas
 * with the morning light at the top, both standing still while the content scrolls.
 */
export function PageBackground({ height = 360 }: { height?: number }) {
  return (
    <View style={[StyleSheet.absoluteFill, styles.canvas]}>
      <MorningLight height={height} />
    </View>
  );
}

const styles = StyleSheet.create({
  light: {
    pointerEvents: 'none',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  canvas: {
    pointerEvents: 'none',
    backgroundColor: Colors.canvas,
  },
});
