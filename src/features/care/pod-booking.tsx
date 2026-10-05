import { Activity } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { IconTile } from '@/components/ui/icon-tile';
import { Surface } from '@/components/ui/surface';
import { Colors, Spacing } from '@/constants/theme';

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
      <ThemedText type="subtitle">Pods near you</ThemedText>

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
                index > 0 && styles.podDivider,
                pressed && styles.pressed,
              ]}>
              <IconTile icon={Activity} tone={selected ? 'primary' : 'neutral'} size={36} />
              <View style={styles.flex}>
                <ThemedText type="smallBold" numberOfLines={1}>
                  {item.name}
                </ThemedText>
                <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
                  {item.tier}, {hours}
                </ThemedText>
              </View>
              <ThemedText type="smallBold" themeColor={selected ? 'primary' : 'text'}>
                {item.distanceKm} km
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      {pod && slot ? (
        <View style={styles.slots}>
          <ThemedText type="caption" themeColor="textSecondary">
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
    gap: Spacing.two,
    padding: Spacing.three,
  },
  flex: {
    flex: 1,
  },
  pod: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 4,
    paddingVertical: 10,
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
