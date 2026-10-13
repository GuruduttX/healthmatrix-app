import { Image, type ImageSource } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Spacing } from '@/constants/theme';

export type QuickActionId = 'video-consult' | 'book-pod' | 'medicines' | 'add-records';

type Action = {
  id: QuickActionId;
  label: string;
  /** What a screen reader says for the button. */
  spoken: string;
  art: ImageSource;
  /** The art's width over its height. */
  aspect?: number;
  /** The art's height as a share of the dish, and how far it sits below centre (a share too). */
  fill: number;
  drop?: number;
};

/**
 * The pod is Cloudspital's Arc pod from the HealthMatrix brochure (assets/images/home/3d/LICENSE);
 * the doctor, medicines and records are AI-generated images the team supplied
 * (assets/images/home/CREDITS).
 */
const ACTIONS: Action[] = [
  {
    id: 'video-consult',
    label: 'Consult',
    spoken: 'Video consult',
    art: require('@/assets/images/home/actions/consult.png'),
    aspect: 300 / 291,
    // A portrait: large and low, so the face fills the dish and its edge crops the coat.
    fill: 1.25,
    drop: 0.17,
  },
  {
    id: 'book-pod',
    label: 'Book pod',
    spoken: 'Book a screening pod',
    art: require('@/assets/images/home/3d/pod.png'),
    aspect: 274 / 420,
    // Framed like the doctor: large, cut at the floor, so the arch, screen and seat fill the dish.
    fill: 1.16,
    drop: 0.15,
  },
  {
    id: 'medicines',
    label: 'Medicines',
    spoken: 'Medicines',
    art: require('@/assets/images/home/actions/medicines.png'),
    aspect: 256 / 250,
    fill: 0.8,
  },
  {
    id: 'add-records',
    label: 'Records',
    spoken: 'Records',
    art: require('@/assets/images/home/actions/records.png'),
    aspect: 221 / 256,
    fill: 0.8,
  },
];

const DISH = 64;
/** How far a name may run past its dish on each side, so "Medicines" is never cut short. */
const LABEL_SPILL = 14;
/**
 * One dish for all four, so the row reads as a set: white in the light, warming to a soft apricot,
 * a step deeper than the page so the dishes never melt into it.
 */
const DISH_TINT = ['#FFFFFF', '#FBE3D4'] as const;

/** The four everyday services on Home: a 3D picture of each in a round tinted dish, the name under it. */
export function QuickActions({ onPress }: { onPress: (id: QuickActionId) => void }) {
  return (
    <View style={styles.row}>
      {ACTIONS.map(({ id, label, spoken, art, aspect = 1, fill, drop = 0 }) => (
        <Pressable
          key={id}
          onPress={() => onPress(id)}
          accessibilityRole="button"
          accessibilityLabel={spoken}
          style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
          {/* The shadow sits outside; a plain View rounds and clips the dish and its art. */}
          <View style={styles.dishShadow}>
            <View style={styles.dish}>
              <LinearGradient
                colors={DISH_TINT}
                start={{ x: 0.2, y: 0 }}
                end={{ x: 0.8, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              {/* A layer of its own, so it paints above the gradient on web too. */}
              <View style={[StyleSheet.absoluteFill, styles.center]}>
                <Image
                  source={art}
                  style={{
                    width: DISH * fill * aspect,
                    height: DISH * fill,
                    transform: [{ translateY: DISH * drop }],
                  }}
                  contentFit="contain"
                  accessibilityIgnoresInvertColors
                />
              </View>
            </View>
          </View>
          <View style={styles.labelBox}>
            <ThemedText style={styles.label} numberOfLines={1}>
              {label}
            </ThemedText>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // The first and last dishes sit on the page's edges, in line with every other section.
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  item: {
    width: DISH,
    alignItems: 'center',
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.95 }],
  },
  // No rim or ring: the dish is lifted by its shadow alone, close and soft, then wide and faint.
  dishShadow: {
    borderRadius: DISH / 2,
    boxShadow: '0 1px 2px rgba(58, 36, 22, 0.06), 0 8px 18px rgba(58, 36, 22, 0.09)',
  },
  dish: {
    width: DISH,
    height: DISH,
    borderRadius: DISH / 2,
    overflow: 'hidden',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Wider than the dish and centred under it; the row's spacing still follows the dishes.
  labelBox: {
    width: DISH + LABEL_SPILL * 2,
    marginHorizontal: -LABEL_SPILL,
    alignItems: 'center',
  },
  label: {
    maxWidth: '100%',
    fontFamily: Fonts.semibold,
    fontSize: 13.5,
    lineHeight: 18,
    color: Colors.text,
  },
});
