import { Image, type ImageSource } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Gradients, Shadows } from '@/constants/theme';

import { LIST_LEAD } from './list';

type DishProps = {
  /** The dish's diameter. */
  size?: number;
  /**
   * `quiet` (white to the faintest warm) for leads in a list; `warm` (white to apricot), Home's
   * quick-action tint, for a dish that stands on its own.
   */
  tint?: 'quiet' | 'warm';
  /** Lift it off the page with Home's two-layer dish shadow. */
  lifted?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

/**
 * A round tinted dish, the lead shape on every card: one shared tint, never a colour per item. A
 * plain View rounds and clips; the tint is a layer, and the content one more above it, so it
 * paints over the gradient on web too. The shadow, when lifted, sits on an outer wrapper.
 */
export function Dish({ size = LIST_LEAD, tint = 'quiet', lifted = false, style, children }: DishProps) {
  const round = { width: size, height: size, borderRadius: size / 2 };
  const dish = (
    <View style={[styles.clip, round, !lifted && style]}>
      <LinearGradient
        colors={tint === 'warm' ? Gradients.dish : Gradients.dishQuiet}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View>
    </View>
  );
  return lifted ? <View style={[round, styles.lifted, style]}>{dish}</View> : dish;
}

type ArtDishProps = Omit<DishProps, 'children'> & {
  art: ImageSource;
  /** The picture's height; a little over half the dish unless set. */
  artSize?: number;
  /** The picture's width over its height. */
  aspect?: number;
  /** How far below centre the picture sits, as a share of the dish: a pod cut at the floor. */
  drop?: number;
  faded?: boolean;
};

/** A 3D picture in a round dish, as on Home's Today card and quick actions. */
export function ArtDish({
  art,
  size = LIST_LEAD,
  artSize = Math.round(size * 0.58),
  aspect = 1,
  drop = 0,
  faded = false,
  ...dish
}: ArtDishProps) {
  return (
    <Dish size={size} {...dish}>
      <Image
        source={art}
        style={[
          { width: artSize * aspect, height: artSize, transform: [{ translateY: size * drop }] },
          faded && styles.faded,
        ]}
        contentFit="contain"
        accessibilityIgnoresInvertColors
        aria-hidden
      />
    </Dish>
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  lifted: {
    boxShadow: Shadows.dish,
  },
  faded: {
    opacity: 0.45,
  },
});
