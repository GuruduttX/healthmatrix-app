import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { Gradients } from '@/constants/theme';

/** Rounding of the bottom corners of every dark header. */
export const HERO_RADIUS = 32;

/**
 * The ink gradient behind Home's hero and each tab's header, with a warm glow from the top
 * right and a cool one from the bottom left. A plain View rounds and clips it, and each glow is
 * a full-size gradient layer, so it draws the same on iOS, Android and web with no hard edges.
 * Place it first inside the header, which should not clip.
 */
export function HeroBackground() {
  return (
    <View style={styles.clip} pointerEvents="none">
      <LinearGradient
        colors={Gradients.hero}
        locations={[0, 0.55, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(221, 67, 1, 0.42)', 'rgba(221, 67, 1, 0.1)', 'rgba(221, 67, 1, 0)']}
        locations={[0, 0.35, 0.75]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.2, y: 0.8 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(16, 128, 109, 0)', 'rgba(16, 128, 109, 0.32)']}
        start={{ x: 0.55, y: 0.35 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    borderBottomLeftRadius: HERO_RADIUS,
    borderBottomRightRadius: HERO_RADIUS,
  },
});
