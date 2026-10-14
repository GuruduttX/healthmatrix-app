import { router } from 'expo-router';
import { AlertCircle, Check, Clock, Eye, type LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ArtDish } from '@/components/ui/dish';
import { Chevron, LIST_LEAD, ListCard, ListRow, listText } from '@/components/ui/list';
import { Section } from '@/components/ui/section';
import { Tag } from '@/components/ui/tag';
import { shortDate } from '@/features/records/record-row';

import { type PodBooking } from './types';

/** The Arc pod from the HealthMatrix brochure; see assets/images/home/3d/LICENSE. */
const POD_ART = require('@/assets/images/home/3d/pod.png');
const POD_ASPECT = 274 / 420;
/** Bookings on the Care tab; the rest are a tap away in the history. */
const SHOWN = 3;

const ICONS: Record<PodBooking['progress']['tone'], LucideIcon> = {
  neutral: Clock,
  success: Check,
  warning: Eye,
  danger: AlertCircle,
};

const openHistory = () => router.push('/care/pod-bookings');

/**
 * One pod booking: what was booked, where and when, and where it is now. With results it opens
 * the record; otherwise its own page, to see the tests or move it to another pod.
 */
export function PodBookingRow({ booking }: { booking: PodBooking }) {
  const what =
    booking.profiles.length > 1
      ? `${booking.profiles[0]} + ${booking.profiles.length - 1} more`
      : (booking.profiles[0] ?? `${booking.testCount} ${booking.testCount === 1 ? 'test' : 'tests'}`);
  const day = shortDate(booking.date);
  const { recordId } = booking;

  return (
    <ListRow
      leading={<ArtDish art={POD_ART} artSize={LIST_LEAD * 1.16} aspect={POD_ASPECT} drop={0.15} />}
      title={what}
      subtitle={
        // The ID matters until the pod has tested them; then the results do.
        <View>
          <ThemedText style={listText.subtitle} numberOfLines={1}>
            {/* The day first: a long pod name may be cut, the date never is. */}
            {day} · {booking.pod.name}
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
      trailing={<Chevron />}
      onPress={() =>
        recordId
          ? router.push({ pathname: '/records/[id]', params: { id: recordId } })
          : router.push({ pathname: '/care/pod-bookings/[id]', params: { id: booking.id } })
      }
      accessibilityLabel={`${what} at ${booking.pod.name}, booked ${day}, ${booking.progress.label}. ${recordId ? 'Opens the results' : 'Opens the booking'}`}
    />
  );
}

type PodBookingsCardProps = {
  /** Null while loading; the card stays hidden until there is something to show. */
  bookings: PodBooking[] | null;
  index?: number;
};

/** The member's latest pod bookings on the Care tab, with every one in the history behind it. */
export function PodBookingsCard({ bookings, index }: PodBookingsCardProps) {
  if (!bookings?.length) return null;

  return (
    <Section
      title="Your pod bookings"
      actionLabel={bookings.length > SHOWN ? `See all ${bookings.length}` : 'History'}
      onAction={openHistory}
      index={index}>
      <ListCard>
        {bookings.slice(0, SHOWN).map((booking) => (
          <PodBookingRow key={booking.id} booking={booking} />
        ))}
      </ListCard>
    </Section>
  );
}
