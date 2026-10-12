import { Image } from 'expo-image';
import { ChevronRight, MapPin } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Radius, Shadows, Spacing } from '@/constants/theme';

import { type Pod } from './sample-data';

type FindPodCardProps = {
  pods: Pod[];
  onPress?: () => void;
};

/** Entry point on the Care tab: opens the pod finder with the map, slots and booking. */
export function FindPodCard({ pods, onPress }: FindPodCardProps) {
  const nearest = pods.length ? pods.reduce((a, b) => (b.distanceKm < a.distanceKm ? b : a)) : null;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        nearest
          ? `Find a pod near you. ${pods.length} nearby, the closest is ${nearest.name}, ${nearest.distanceKm} km away`
          : 'Find a pod near you'
      }
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      {/* Photo: Pexels (free to use), assets/images/home. */}
      <Image
        source={require('@/assets/images/home/book-pod.jpg')}
        style={styles.photo}
        contentFit="cover"
        accessibilityIgnoresInvertColors
      />
      <View style={styles.text}>
        <ThemedText type="bodyBold" numberOfLines={1}>
          Screening pods near you
        </ThemedText>
        <ThemedText type="caption" themeColor="textSecondary" numberOfLines={2}>
          {nearest
            ? `${nearest.name} · ${nearest.hours}`
            : 'See pods on the map and book a slot'}
        </ThemedText>
        {nearest ? (
          <View style={styles.pills}>
            <View style={styles.pill}>
              <MapPin size={11} color={Colors.success} strokeWidth={2.6} />
              <ThemedText style={styles.pillText}>{nearest.distanceKm} km</ThemedText>
            </View>
            <ThemedText type="caption" themeColor="textMuted">
              {pods.length} {pods.length === 1 ? 'pod' : 'pods'} nearby
            </ThemedText>
          </View>
        ) : null}
      </View>
      <ChevronRight size={18} color={Colors.textMuted} strokeWidth={2.2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
    padding: 10,
    paddingRight: Spacing.three,
    borderRadius: Radius.xl - 2,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
    boxShadow: Shadows.card,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  photo: {
    width: 76,
    height: 76,
    borderRadius: Radius.lg,
    backgroundColor: Colors.backgroundSelected,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  pills: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: 4,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: Radius.pill,
    backgroundColor: Colors.successSoft,
  },
  pillText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    lineHeight: 14,
    color: Colors.success,
  },
});
