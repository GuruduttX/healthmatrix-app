import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { LogoMark } from '@/components/ui/logo-mark';
import { Colors, Gradients } from '@/constants/theme';

/** The petals in three tones of white, echoing the logo's three oranges. */
const PETAL_TONES = [Colors.onInk, Colors.onInk, Colors.onInk] as const;
const PETAL_OPACITIES = [1, 0.84, 0.68] as const;

type EkaayMarkProps = {
  size: number;
  /** A circle in the tab bar and beside chat bubbles; a rounded square on cards. */
  shape?: 'circle' | 'square';
  style?: StyleProp<ViewStyle>;
};

/**
 * Ekaay's mark: the HealthMatrix petals in white on the brand's orange, so the assistant reads as
 * part of HealthMatrix wherever it appears.
 */
export function EkaayMark({ size, shape = 'circle', style }: EkaayMarkProps) {
  return (
    // A plain View rounds and clips; the gradients are layers inside it.
    <View
      style={[
        styles.mark,
        { width: size, height: size, borderRadius: shape === 'circle' ? size / 2 : size * 0.32 },
        style,
      ]}
      aria-hidden
      importantForAccessibility="no-hide-descendants">
      <LinearGradient
        colors={Gradients.brand}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* A soft sheen from the top left. */}
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.22)', 'rgba(255, 255, 255, 0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.7, y: 0.7 }}
        style={StyleSheet.absoluteFill}
      />
      {/* A layer of its own, so it paints above the gradients on web too. */}
      <View style={StyleSheet.absoluteFill}>
        <LogoMark
          size={size}
          scale={shape === 'circle' ? 0.56 : 0.6}
          colors={PETAL_TONES}
          opacities={PETAL_OPACITIES}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mark: {
    overflow: 'hidden',
  },
});
