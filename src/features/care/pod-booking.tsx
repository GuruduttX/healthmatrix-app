import { Check } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ArtDish } from '@/components/ui/dish';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Divided, LIST_LEAD, listText } from '@/components/ui/list';
import { Section } from '@/components/ui/section';
import { Colors, Fonts, Radius, Shadows, Spacing } from '@/constants/theme';

import { sampleCare, type Pod } from './sample-data';

/** The Arc pod from the HealthMatrix brochure; see assets/images/home/3d/LICENSE. */
const POD_ART = require('@/assets/images/home/3d/pod.png');
const POD_ASPECT = 274 / 420;
const RADIO = 22;

type PodBookingProps = {
  pods: Pod[];
  booking: (typeof sampleCare)['booking'];
  podId?: string;
  slot?: string;
  onSelectPod: (id: string) => void;
  onSelectSlot: (slot: string) => void;
  onBook?: (pod: Pod, slot: string) => void;
};

/**
 * Pick a nearby pod, then a slot for the test that is due: the pods as rows on one card (raised,
 * over the map), the day's slots on the page under it, and Book.
 */
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
    <View style={styles.root}>
      <View style={styles.card}>
        <View style={styles.header}>
          <ThemedText style={styles.title} accessibilityRole="header">
            Pods near you
          </ThemedText>
          <ThemedText style={styles.caption}>
            Pick a pod, then a slot for your {booking.test} test.
          </ThemedText>
        </View>
        <View style={styles.rule} />

        <View accessibilityRole="radiogroup">
          <Divided>
            {pods.map((item) => {
              const selected = item.id === podId;
              const hours = item.hours.charAt(0).toLowerCase() + item.hours.slice(1);
              return (
                <Pressable
                  key={item.id}
                  onPress={() => onSelectPod(item.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                  <ArtDish
                    art={POD_ART}
                    artSize={LIST_LEAD * 1.16}
                    aspect={POD_ASPECT}
                    drop={0.15}
                  />
                  <View style={styles.flex}>
                    <ThemedText style={listText.title} numberOfLines={1}>
                      {item.name}
                    </ThemedText>
                    <ThemedText style={listText.subtitle} numberOfLines={1}>
                      {item.tier}, {hours}
                    </ThemedText>
                  </View>
                  <ThemedText style={[styles.distance, selected && styles.distanceSelected]}>
                    {item.distanceKm} km
                  </ThemedText>
                  {/* Chosen: solid ink with a tick, like every other choice in the app. */}
                  <View style={[styles.radio, selected && styles.radioSelected]}>
                    {selected ? <Check size={13} color={Colors.onInk} strokeWidth={3} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </Divided>
        </View>
      </View>

      {pod && slot ? (
        <>
          <Section title={`${booking.day} slots`} caption={`At ${pod.name}`} index={1}>
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
          </Section>
          <Button
            label={`Book ${booking.test} at ${slot}`}
            onPress={onBook ? () => onBook(pod, slot) : undefined}
          />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: Spacing.four - 4,
  },
  // The screen's one raised card, riding over the bottom of the map.
  card: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.one,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.hairline,
    backgroundColor: Colors.backgroundElement,
    boxShadow: Shadows.raised,
  },
  header: {
    gap: 2,
  },
  title: {
    fontFamily: Fonts.displaySemibold,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.3,
    color: Colors.text,
  },
  caption: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSoft,
  },
  // A hairline across the whole card.
  rule: {
    height: StyleSheet.hairlineWidth,
    marginTop: Spacing.three - 4,
    marginHorizontal: -Spacing.three,
    backgroundColor: Colors.hairline,
  },
  flex: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
    minHeight: 60,
    paddingVertical: Spacing.two + 3,
  },
  pressed: {
    opacity: 0.6,
  },
  distance: {
    fontFamily: Fonts.semibold,
    fontSize: 13,
    lineHeight: 17,
    color: Colors.textFaint,
    fontVariant: ['tabular-nums'],
  },
  distanceSelected: {
    fontFamily: Fonts.bold,
    color: Colors.text,
  },
  radio: {
    width: RADIO,
    height: RADIO,
    borderRadius: RADIO / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
  },
  radioSelected: {
    borderColor: Colors.text,
    backgroundColor: Colors.text,
  },
  slotRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
