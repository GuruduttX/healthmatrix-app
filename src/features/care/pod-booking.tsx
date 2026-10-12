import { Activity } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { IconTile } from '@/components/ui/icon-tile';
import { Surface } from '@/components/ui/surface';
import { Colors, Fonts, Radius, Shadows, Spacing } from '@/constants/theme';

import { sampleCare, type Pod } from './sample-data';

type PodBookingProps = {
  pods: Pod[];
  booking: (typeof sampleCare)['booking'];
  podId?: string;
  slot?: string;
  onSelectPod: (id: string) => void;
  onSelectSlot: (slot: string) => void;
  onBook?: (pod: Pod, slot: string) => void;
};

/** Pick a nearby pod and a slot for the test that is due. */
export function PodBooking({
  pods,
  booking,
  podId,
  slot,
  onSelectPod,
  onSelectSlot,
  onBook,
}: PodBookingProps) {
  const pod = pods.find((item) => item.id === podId);

  return (
    <Surface style={styles.card}>
      <View>
        <ThemedText style={styles.title}>Pods near you</ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          Pick a pod, then a slot for your {booking.test} test.
        </ThemedText>
      </View>

      <View>
        {pods.map((item, index) => {
          const selected = item.id === podId;
          const hours = item.hours.charAt(0).toLowerCase() + item.hours.slice(1);
          return (
            <Pressable
              key={item.id}
              onPress={() => onSelectPod(item.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={({ pressed }) => [
                styles.pod,
                selected && styles.podSelected,
                index > 0 && !selected && styles.podDivider,
                pressed && styles.pressed,
              ]}>
              <IconTile icon={Activity} tone={selected ? 'primary' : 'neutral'} size={40} />
              <View style={styles.flex}>
                <ThemedText type="smallBold" numberOfLines={1}>
                  {item.name}
                </ThemedText>
                <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
                  {item.tier}, {hours}
                </ThemedText>
              </View>
              <View style={[styles.distance, selected && styles.distanceSelected]}>
                <ThemedText style={[styles.distanceText, selected && styles.distanceTextSelected]}>
                  {item.distanceKm} km
                </ThemedText>
              </View>
            </Pressable>
          );
        })}
      </View>

      {pod && slot ? (
        <View style={styles.slots}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            {booking.day} slots at {pod.name}
          </ThemedText>
          <View style={styles.slotRow}>
            {booking.slots.map((time) => (
              <Chip
                key={time}
                label={time}
                selected={time === slot}
                onPress={() => onSelectSlot(time)}
              />
            ))}
          </View>
          <Button
            label={`Book ${booking.test} at ${slot}`}
            onPress={onBook ? () => onBook(pod, slot) : undefined}
          />
        </View>
      ) : null}
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three - 4,
    borderRadius: Radius.xl,
    boxShadow: Shadows.lifted,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 20,
    lineHeight: 26,
  },
  flex: {
    flex: 1,
  },
  pod: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginHorizontal: -10,
    borderRadius: Radius.lg,
  },
  podSelected: {
    backgroundColor: Colors.primarySoft,
  },
  distance: {
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: Radius.pill,
    backgroundColor: Colors.backgroundSelected,
  },
  distanceSelected: {
    backgroundColor: Colors.primary,
  },
  distanceText: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.inkMid,
  },
  distanceTextSelected: {
    color: Colors.onInk,
  },
  podDivider: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  pressed: {
    opacity: 0.7,
  },
  slots: {
    gap: Spacing.two + 2,
  },
  slotRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
