import { ChevronRight, MapPin } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconTile } from '@/components/ui/icon-tile';
import { Surface } from '@/components/ui/surface';
import { Colors, Spacing } from '@/constants/theme';

import { type Pod } from './sample-data';

type FindPodCardProps = {
  pods: Pod[];
  onPress?: () => void;
};

/** Entry point on the Care tab: opens the pod finder with the map, slots and booking. */
export function FindPodCard({ pods, onPress }: FindPodCardProps) {
  const nearest = Math.min(...pods.map((pod) => pod.distanceKm));
  const summary =
    pods.length > 0
      ? `${pods.length} ${pods.length === 1 ? 'pod' : 'pods'} nearby, the closest is ${nearest} km away`
      : 'See pods on the map and book a slot';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Find a pod near you"
      style={({ pressed }) => pressed && styles.pressed}>
      <Surface style={styles.card}>
        <IconTile icon={MapPin} />
        <View style={styles.flex}>
          <ThemedText type="smallBold">Find a pod near you</ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            {summary}
          </ThemedText>
        </View>
        <ChevronRight size={18} color={Colors.textMuted} strokeWidth={2.2} />
      </Surface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 4,
  },
  flex: {
    flex: 1,
  },
  pressed: {
    opacity: 0.75,
  },
});
