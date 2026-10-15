import { Check, DoorOpen } from 'lucide-react-native';
import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ArtDish } from '@/components/ui/dish';
import { Button } from '@/components/ui/button';
import { Glass } from '@/components/ui/glass';
import { IconTile } from '@/components/ui/icon-tile';
import { Divided, LIST_LEAD, ListCard, ListRow, listText } from '@/components/ui/list';
import { Section } from '@/components/ui/section';
import { Colors, Fonts, Glass as GlassTokens, Spacing } from '@/constants/theme';

import { type Pod } from './types';

/** The Arc pod from the HealthMatrix brochure; see assets/images/home/3d/LICENSE. */
const POD_ART = require('@/assets/images/home/3d/pod.png');
const POD_ASPECT = 274 / 420;
const RADIO = 22;

type PodBookingProps = {
  pods: Pod[];
  podId?: string;
  /** How many tests are chosen, for the Book button. */
  testCount: number;
  onSelectPod: (id: string) => void;
  onBook: (pod: Pod) => void;
  /** A booking is being sent. */
  booking?: boolean;
  /** Why the last try failed, shown over the button. */
  error?: string | null;
  /** The test picker and any details the lab still needs, between the pods and Book. */
  children?: ReactNode;
};

/**
 * Pick a pod, then the tests, and Book: the pods as rows on one pane of glass (riding over the
 * map), the tests on the page under it. Walk-in: Mobilab bookings have no time, so there are no
 * slots; the booking waits in the pod's queue until the member arrives.
 */
export function PodBooking({
  pods,
  podId,
  testCount,
  onSelectPod,
  onBook,
  booking = false,
  error,
  children,
}: PodBookingProps) {
  const pod = pods.find((item) => item.id === podId);

  return (
    <View style={styles.root}>
      <Glass style={styles.card}>
        <View style={styles.header}>
          <ThemedText style={styles.title} accessibilityRole="header">
            Pods near you
          </ThemedText>
          <ThemedText style={styles.caption}>
            Pick a pod, then the tests you want.
          </ThemedText>
        </View>
        <View style={styles.rule} />

        <View accessibilityRole="radiogroup">
          <Divided>
            {pods.map((item) => {
              const selected = item.id === podId;
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
                    {item.address ? (
                      <ThemedText style={listText.subtitle} numberOfLines={1}>
                        {item.address}
                      </ThemedText>
                    ) : null}
                  </View>
                  {/* Chosen: solid ink with a tick, like every other choice in the app. */}
                  <View style={[styles.radio, selected && styles.radioSelected]}>
                    {selected ? <Check size={13} color={Colors.onInk} strokeWidth={3} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </Divided>
        </View>
      </Glass>

      {pod ? children : null}

      {pod ? (
        <>
          <Section index={4}>
            <ListCard>
              <ListRow
                leading={<IconTile icon={DoorOpen} tone="neutral" />}
                title="No appointment needed"
                subtitle={`Walk in to ${pod.name} when it’s open and give the operator your phone number.`}
              />
            </ListCard>
          </Section>
          <View style={styles.footer}>
            {error ? (
              <ThemedText style={styles.error} accessibilityRole="alert">
                {error}
              </ThemedText>
            ) : null}
            <Button
              label={
                testCount
                  ? `Book ${testCount} ${testCount === 1 ? 'test' : 'tests'}`
                  : 'Choose a test to book'
              }
              disabled={!testCount}
              loading={booking}
              onPress={() => onBook(pod)}
            />
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: Spacing.four - 4,
  },
  // The screen's first pane, riding over the bottom of the map; the map blurs behind it on web.
  card: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.one,
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
    backgroundColor: GlassTokens.hairline,
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
  // A round of glass waiting for a tick, its edge clear while empty.
  radio: {
    width: RADIO,
    height: RADIO,
    borderRadius: RADIO / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: GlassTokens.fillSoft,
    boxShadow: GlassTokens.glowSmall,
  },
  radioSelected: {
    borderColor: Colors.text,
    backgroundColor: Colors.text,
    boxShadow: 'none',
  },
  footer: {
    gap: Spacing.two,
  },
  error: {
    fontFamily: Fonts.medium,
    fontSize: 13.5,
    lineHeight: 19,
    color: Colors.high,
    textAlign: 'center',
  },
});
