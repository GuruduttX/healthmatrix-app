import { CircleCheck } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { ArtDish } from '@/components/ui/dish';
import { Colors, Fonts, Radius, Shadows, Spacing } from '@/constants/theme';

import { type PodBooking } from './types';

/** The Arc pod from the HealthMatrix brochure; see assets/images/home/3d/LICENSE. */
const POD_ART = require('@/assets/images/home/3d/pod.png');
const POD_ASPECT = 274 / 420;
const DISH = 72;

type BookingConfirmedProps = {
  booking: PodBooking;
  onDone: () => void;
};

/**
 * Shown in place of the booking sheet once the pod has the booking: where to go, and the
 * reference to read out at the pod if the operator asks.
 */
export function BookingConfirmed({ booking, onDone }: BookingConfirmedProps) {
  const tests = `${booking.testCount} in total`;

  return (
    <View style={styles.root}>
      <View style={styles.card}>
        <ArtDish
          art={POD_ART}
          size={DISH}
          artSize={DISH * 1.16}
          aspect={POD_ASPECT}
          drop={0.15}
          tint="warm"
        />
        <View style={styles.status}>
          <CircleCheck size={16} color={Colors.good} strokeWidth={2.4} />
          <ThemedText style={styles.statusText}>Booked</ThemedText>
        </View>
        <ThemedText style={styles.title} accessibilityRole="header">
          See you at {booking.pod.name}
        </ThemedText>
        <ThemedText style={styles.body}>
          No appointment needed. Walk in when the pod is open and give the operator your phone
          number. Results come to your records once they’re checked.
        </ThemedText>

        <View style={styles.rule} />

        <View style={styles.facts}>
          <View style={styles.fact}>
            <ThemedText style={styles.factLabel}>Booking ID</ThemedText>
            <ThemedText style={styles.reference} selectable>
              {booking.reference}
            </ThemedText>
          </View>
          {booking.profiles.length ? (
            <View style={styles.fact}>
              <ThemedText style={styles.factLabel}>
                {booking.profiles.length === 1 ? 'Health check' : 'Health checks'}
              </ThemedText>
              <ThemedText style={styles.factValue}>{booking.profiles.join(', ')}</ThemedText>
            </View>
          ) : null}
          <View style={styles.fact}>
            <ThemedText style={styles.factLabel}>Tests</ThemedText>
            <ThemedText style={styles.factValue}>{tests}</ThemedText>
          </View>
        </View>
      </View>

      <Button label="Done" onPress={onDone} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: Spacing.four - 4,
  },
  card: {
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.hairline,
    backgroundColor: Colors.backgroundElement,
    boxShadow: Shadows.raised,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: Spacing.three,
  },
  statusText: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    lineHeight: 17,
    color: Colors.good,
  },
  title: {
    marginTop: Spacing.one,
    fontFamily: Fonts.displaySemibold,
    fontSize: 21,
    lineHeight: 27,
    letterSpacing: -0.3,
    color: Colors.text,
    textAlign: 'center',
  },
  body: {
    marginTop: Spacing.two,
    fontFamily: Fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSoft,
    textAlign: 'center',
  },
  rule: {
    alignSelf: 'stretch',
    height: StyleSheet.hairlineWidth,
    marginTop: Spacing.three,
    marginHorizontal: -Spacing.four,
    backgroundColor: Colors.hairline,
  },
  facts: {
    alignSelf: 'stretch',
    gap: Spacing.three - 4,
    paddingTop: Spacing.three,
  },
  fact: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  factLabel: {
    fontFamily: Fonts.medium,
    fontSize: 13.5,
    lineHeight: 18,
    color: Colors.textSoft,
  },
  factValue: {
    flexShrink: 1,
    fontFamily: Fonts.semibold,
    fontSize: 14,
    lineHeight: 19,
    color: Colors.text,
    textAlign: 'right',
  },
  reference: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: 0.8,
    color: Colors.text,
    fontVariant: ['tabular-nums'],
  },
});
