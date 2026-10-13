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
  /** The dish behind the art, light to deep, in a tint that sets the art off. */
  tint: readonly [string, string];
  /** The art's height as a share of the dish, and how far it sits below centre (a share too). */
  fill: number;
  drop?: number;
};

/**
 * The pod is Cloudspital's Arc pod from the HealthMatrix brochure; the rest is Microsoft Fluent
 * Emoji, MIT licence. Both are noted in assets/images/home/3d/LICENSE.
 */
const ACTIONS: Action[] = [
  {
    id: 'video-consult',
    label: 'Consult',
    spoken: 'Video consult',
    art: require('@/assets/images/home/3d/doctor.png'),
    tint: ['#F2F8FB', '#D6E8F1'],
    // A portrait: sits low, so the dish crops the coat like a photo frame.
    fill: 1,
    drop: 0.1,
  },
  {
    id: 'book-pod',
    label: 'Book pod',
    spoken: 'Book a screening pod',
    art: require('@/assets/images/home/3d/pod.png'),
    aspect: 274 / 420,
    tint: ['#F3FAF5', '#D8EEDF'],
    // Framed like the doctor: large, cut at the floor, so the arch, screen and seat fill the dish.
    fill: 1.16,
    drop: 0.15,
  },
  {
    id: 'medicines',
    label: 'Medicines',
    spoken: 'Medicines',
    art: require('@/assets/images/home/3d/medicine.png'),
    tint: ['#FFF6F2', '#FADDD3'],
    fill: 0.74,
  },
  {
    id: 'add-records',
    label: 'Records',
    spoken: 'Records',
    art: require('@/assets/images/home/3d/records.png'),
    tint: ['#FFFAF2', '#F3E4CE'],
    fill: 0.82,
  },
];

const DISH = 70;

/** The four everyday services on Home: a 3D picture of each in a round tinted dish, the name under it. */
export function QuickActions({ onPress }: { onPress: (id: QuickActionId) => void }) {
  return (
    <View style={styles.row}>
      {ACTIONS.map(({ id, label, spoken, art, aspect = 1, tint, fill, drop = 0 }) => (
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
                colors={tint}
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
          <ThemedText style={styles.label} numberOfLines={1}>
            {label}
          </ThemedText>
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
    width: DISH + 4,
    alignItems: 'center',
    gap: Spacing.two + 2,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.95 }],
  },
  dishShadow: {
    borderRadius: DISH / 2,
    boxShadow: '0 6px 14px rgba(58, 36, 22, 0.1)',
  },
  // A thin white rim, like light catching the edge of a bowl.
  dish: {
    width: DISH,
    height: DISH,
    borderRadius: DISH / 2,
    borderWidth: 1.5,
    borderColor: Colors.backgroundElement,
    overflow: 'hidden',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    maxWidth: '100%',
    fontFamily: Fonts.semibold,
    fontSize: 13.5,
    lineHeight: 18,
    color: Colors.text,
  },
});
