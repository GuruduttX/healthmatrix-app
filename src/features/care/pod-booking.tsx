import { Activity, MapPin } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { IconTile } from '@/components/ui/icon-tile';
import { Surface } from '@/components/ui/surface';
import { Tag } from '@/components/ui/tag';
import { Colors, Radius, Spacing } from '@/constants/theme';

import { sampleCare, type Pod } from './sample-data';

type PodBookingProps = {
  pods: Pod[];
  booking: (typeof sampleCare)['booking'];
  onBook?: (pod: Pod, slot: string) => void;
};

/** Pick a nearby pod and a slot for the test that is due. */
export function PodBooking({ pods, booking, onBook }: PodBookingProps) {
  const [podId, setPodId] = useState(pods[0]?.id);
  const [slot, setSlot] = useState(booking.slots[0]);
  const pod = pods.find((item) => item.id === podId);

  return (
    <Surface style={styles.card}>
      {pods.map((item) => {
        const selected = item.id === podId;
        return (
          <Pressable
            key={item.id}
            onPress={() => setPodId(item.id)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            style={({ pressed }) => [styles.pod, selected && styles.podSelected, pressed && styles.pressed]}>
            <IconTile icon={Activity} tone={selected ? 'primary' : 'neutral'} />
            <View style={styles.flex}>
              <ThemedText type="smallBold" numberOfLines={1}>
                {item.name}
              </ThemedText>
              <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
                {item.hours}
              </ThemedText>
            </View>
            <View style={styles.podMeta}>
              <Tag label={item.tier} tone={selected ? 'primary' : 'neutral'} />
              <View style={styles.distance}>
                <MapPin size={11} color={Colors.textMuted} strokeWidth={2.2} />
                <ThemedText type="caption" themeColor="textMuted">
                  {item.distanceKm} km
                </ThemedText>
              </View>
            </View>
          </Pressable>
        );
      })}

      {pod && slot ? (
        <View style={styles.slots}>
          <ThemedText type="caption" themeColor="textSecondary">
            {booking.day} slots at {pod.name}
          </ThemedText>
          <View style={styles.slotRow}>
            {booking.slots.map((time) => (
              <View key={time} style={styles.slot}>
                <Chip label={time} selected={time === slot} onPress={() => setSlot(time)} />
              </View>
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
    padding: 10,
  },
  flex: {
    flex: 1,
  },
  pod: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 4,
    padding: 8,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  podSelected: {
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.primarySoft,
  },
  pressed: {
    opacity: 0.75,
  },
  podMeta: {
    alignItems: 'flex-end',
    gap: 3,
  },
  distance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  slots: {
    gap: Spacing.two + 2,
    padding: 6,
    paddingTop: Spacing.two + 2,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  slotRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  // Four across where there is room, two across on a phone.
  slot: {
    flexGrow: 1,
    flexBasis: 120,
  },
});
