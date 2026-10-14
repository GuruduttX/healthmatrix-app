import { router } from 'expo-router';
import { AlertCircle, Check, Clock, Eye, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ArtDish } from '@/components/ui/dish';
import { Chevron, LIST_LEAD, ListCard, ListRow, listText } from '@/components/ui/list';
import { Section } from '@/components/ui/section';
import { Tag } from '@/components/ui/tag';

import { type PodBooking } from './types';

/** The Arc pod from the HealthMatrix brochure; see assets/images/home/3d/LICENSE. */
const POD_ART = require('@/assets/images/home/3d/pod.png');
const POD_ASPECT = 274 / 420;
/** Bookings listed: the waiting ones, then results from the last fortnight. */
const SHOWN = 3;
const RECENT_MS = 14 * 24 * 60 * 60 * 1000;

const ICONS: Record<PodBooking['progress']['tone'], LucideIcon> = {
  neutral: Clock,
  success: Check,
  warning: Eye,
  danger: AlertCircle,
};

type PodBookingsCardProps = {
  /** Null while loading; the card stays hidden until there is something to show. */
  bookings: PodBooking[] | null;
  index?: number;
};

/**
 * The member's pod bookings on the Care tab: where each one is, and the results once they're in.
 * A booking with results opens its record; one still waiting shows its ID to read out at the pod.
 */
export function PodBookingsCard({ bookings, index }: PodBookingsCardProps) {
  // Read once: how recent counts as recent needn't tick while the tab is open.
  const [now] = useState(() => Date.now());
  const shown = (bookings ?? [])
    .filter(
      (booking) =>
        booking.status === 'booked' || now - new Date(booking.createdAt).getTime() < RECENT_MS,
    )
    .slice(0, SHOWN);
  if (!shown.length) return null;

  return (
    <Section title="Your pod bookings" index={index}>
      <ListCard>
        {shown.map((booking) => {
          const what =
            booking.profiles.length > 1
              ? `${booking.profiles[0]} + ${booking.profiles.length - 1} more`
              : (booking.profiles[0] ??
                `${booking.testCount} ${booking.testCount === 1 ? 'test' : 'tests'}`);
          const { recordId } = booking;
          return (
            <ListRow
              key={booking.id}
              leading={
                <ArtDish art={POD_ART} artSize={LIST_LEAD * 1.16} aspect={POD_ASPECT} drop={0.15} />
              }
              title={what}
              subtitle={
                // The ID matters until the pod has tested them; then the results do.
                <View>
                  <ThemedText style={listText.subtitle} numberOfLines={1}>
                    {booking.pod.name}
                  </ThemedText>
                  {booking.status === 'booked' ? (
                    <ThemedText style={listText.subtitle} numberOfLines={1}>
                      Booking ID {booking.reference}
                    </ThemedText>
                  ) : null}
                </View>
              }
              meta={
                <Tag
                  label={booking.progress.label}
                  tone={booking.progress.tone}
                  icon={ICONS[booking.progress.tone]}
                />
              }
              trailing={recordId ? <Chevron /> : undefined}
              onPress={
                recordId
                  ? () => router.push({ pathname: '/records/[id]', params: { id: recordId } })
                  : undefined
              }
              accessibilityLabel={`${what} at ${booking.pod.name}, ${booking.progress.label}${recordId ? '. Opens the results' : `. Booking ID ${booking.reference}`}`}
            />
          );
        })}
      </ListCard>
    </Section>
  );
}
