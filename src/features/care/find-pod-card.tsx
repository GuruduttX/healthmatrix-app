import { MapPin } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ArtDish } from '@/components/ui/dish';
import { Glass } from '@/components/ui/glass';
import { Chevron, listText } from '@/components/ui/list';
import { Colors, Fonts, Spacing } from '@/constants/theme';

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
      style={({ pressed }) => pressed && styles.pressed}>
      <Glass style={styles.card}>
        {/* Cloudspital's Arc pod (assets/images/home/3d/LICENSE), large and cut at the floor. */}
        <ArtDish
          art={require('@/assets/images/home/3d/pod.png')}
          size={DISH}
          artSize={DISH * 1.16}
          aspect={POD_ASPECT}
          drop={0.15}
          tint="warm"
        />

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
      </Glass>
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
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
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
