import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Chevron, listText } from '@/components/ui/list';
import { Colors, Fonts, Gradients, Radius, Shadows, Spacing } from '@/constants/theme';

import { type Pod } from './types';

type FindPodCardProps = {
  /** Null while loading; empty when none could be loaded. */
  pods: Pod[] | null;
  /** Why the pods couldn't be loaded, shown in place of "Finding pods…". */
  error?: string | null;
  onPress?: () => void;
};

const DISH = 52;
/** The Arc pod's width over its height. */
const POD_ASPECT = 274 / 420;

/** Entry point on the Care tab: opens the pod finder with the map, slots and booking. */
export function FindPodCard({ pods, error, onPress }: FindPodCardProps) {
  // Pods have no coordinates yet, so there is no nearest one: lead with the first.
  const first = pods?.[0];
  const count = pods?.length ?? 0;
  const where = first ? [first.name, first.city].filter(Boolean).join(' · ') : null;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        where ? `Find a pod near you. ${count} to choose from, including ${where}` : 'Find a pod near you'
      }
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      {/* Cloudspital's Arc pod, as on Home's Book pod button (assets/images/home/3d/LICENSE). */}
      <View style={styles.dish}>
        <LinearGradient
          colors={Gradients.dish}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* A layer of its own, so it paints above the gradient on web too. */}
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          <Image
            source={require('@/assets/images/home/3d/pod.png')}
            style={styles.pod}
            contentFit="contain"
            accessibilityIgnoresInvertColors
            aria-hidden
          />
        </View>
      </View>

      <View style={styles.text}>
        <ThemedText style={listText.title} numberOfLines={1}>
          Screening pods near you
        </ThemedText>
        <ThemedText style={listText.subtitle} numberOfLines={1}>
          {pods === null
            ? (error ?? 'Finding pods…')
            : (where ?? 'See pods on the map and book a slot')}
        </ThemedText>
        {count ? (
          <View style={styles.distance}>
            <MapPin size={12} color={Colors.textFaint} strokeWidth={2.4} />
            <ThemedText style={styles.distanceText} numberOfLines={1}>
              {count} {count === 1 ? 'pod' : 'pods'} to choose from
            </ThemedText>
          </View>
        ) : null}
      </View>
      <Chevron />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
    paddingVertical: Spacing.three - 4,
    paddingLeft: Spacing.three - 2,
    paddingRight: Spacing.three - 4,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.hairline,
    backgroundColor: Colors.backgroundElement,
    boxShadow: Shadows.soft,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
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
  // Framed like Home's: large, cut at the floor, so the arch, screen and seat fill the dish.
  pod: {
    width: DISH * 1.16 * POD_ASPECT,
    height: DISH * 1.16,
    transform: [{ translateY: DISH * 0.15 }],
  },
  text: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  distance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  distanceText: {
    flexShrink: 1,
    fontFamily: Fonts.semibold,
    fontSize: 12.5,
    lineHeight: 16,
    color: Colors.textFaint,
    fontVariant: ['tabular-nums'],
  },
});
