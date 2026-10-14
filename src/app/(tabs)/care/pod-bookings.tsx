import { router } from 'expo-router';
import { FlaskConical, Plus } from 'lucide-react-native';

import { Screen } from '@/components/screen';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { ListCard } from '@/components/ui/list';
import { Section } from '@/components/ui/section';
import { SkeletonList } from '@/components/ui/skeleton';
import { HeaderIconButton } from '@/components/ui/stack-header';
import { Colors } from '@/constants/theme';
import { PodBookingRow } from '@/features/care/pod-bookings-card';
import { type PodBooking } from '@/features/care/types';
import { usePodBookings } from '@/features/care/use-pod-bookings';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const bookTests = () => router.push('/care/pods');

/** "2026-10-14" -> "October 2026" */
function monthOf(date: string) {
  const [year, month] = date.split('-').map(Number);
  return `${MONTHS[(month ?? 1) - 1]} ${year}`;
}

/** Bookings by the month they were made, newest month first, keeping their order. */
function byMonth(bookings: PodBooking[]) {
  const months: { title: string; bookings: PodBooking[] }[] = [];
  for (const booking of bookings) {
    const title = monthOf(booking.date);
    const last = months[months.length - 1];
    if (last?.title === title) last.bookings.push(booking);
    else months.push({ title, bookings: [booking] });
  }
  return months;
}

/**
 * Every pod booking the member has made, newest first, a card per month: where each one is, and
 * the results once they're in. Pull down to check the waiting ones with the pod again.
 */
export default function PodBookingsScreen() {
  const { bookings, error, refresh } = usePodBookings();

  return (
    <Screen
      onBack={() => router.dismissTo('/care')}
      backLabel="Care"
      barTitle="Pod bookings"
      barRight={
        <HeaderIconButton
          icon={<Plus size={18} color={Colors.primaryDeep} strokeWidth={2.5} />}
          label="Book tests at a pod"
          onPress={bookTests}
        />
      }
      onRefresh={refresh}>
      {bookings === null ? (
        error ? (
          <ErrorState title="Couldn’t load your bookings" message={error} onRetry={() => void refresh()} />
        ) : (
          <SkeletonList rows={4} leading="circle" trailing={false} label="Loading your bookings" />
        )
      ) : !bookings.length ? (
        <EmptyState
          icon={FlaskConical}
          title="No pod bookings yet"
          body="Book a health check at a pod near you. Your bookings and their results show up here."
          action={{ label: 'Book tests', onPress: bookTests }}
        />
      ) : (
        byMonth(bookings).map((month, index) => (
          <Section
            key={month.title}
            title={month.title}
            meta={`${month.bookings.length} ${month.bookings.length === 1 ? 'booking' : 'bookings'}`}
            index={index}>
            <ListCard>
              {month.bookings.map((booking) => (
                <PodBookingRow key={booking.id} booking={booking} />
              ))}
            </ListCard>
          </Section>
        ))
      )}
    </Screen>
  );
}
