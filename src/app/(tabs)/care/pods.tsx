import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, MapPinOff, RotateCw, Search } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonList } from '@/components/ui/skeleton';
import { Colors, Fonts, Gutter, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-context';
import { BookingConfirmed } from '@/features/care/booking-confirmed';
import { LabDetails, parseDateInput, type LabSex } from '@/features/care/lab-details';
import { PodBooking } from '@/features/care/pod-booking';
import { PodMap } from '@/features/care/pod-map';
import { sampleCare } from '@/features/care/sample-data';
import { coveredTests, TestPicker } from '@/features/care/test-picker';
import { type PodBooking as Booking } from '@/features/care/types';
import { refreshPodBookings } from '@/features/care/use-pod-bookings';
import { usePodCatalog } from '@/features/care/use-pod-catalog';
import { useTabBarClearance } from '@/hooks/use-tab-bar-clearance';
import { api } from '@/services/api';

const MAP_HEIGHT = 300;
const BAR_HEIGHT = 44;
/** How far the pod card rides up over the bottom of the map. */
const CARD_OVERLAP = 44;

/** `toggle(list, x)`: x added, or taken out if it was there. */
const toggle = (list: string[], code: string) =>
  list.includes(code) ? list.filter((item) => item !== code) : [...list, code];

/**
 * Pod finder: pods on a map, the tests they run, and booking. Walk-in, so no slots: the booking
 * goes into the pod's queue and the member is tested when they arrive. Opened with
 * `?profile=<id>` from a health check on the Care tab, that check starts chosen.
 */
export default function PodsScreen() {
  const { userLocation } = sampleCare;
  const { member, refreshMember } = useAuth();
  const { profile } = useLocalSearchParams<{ profile?: string }>();
  const { catalog, error, refresh } = usePodCatalog();
  const pods = catalog?.pods ?? [];
  const insets = useSafeAreaInsets();
  const clearance = useTabBarClearance();

  const [chosenPodId, setPodId] = useState<string>();
  const [profileIds, setProfileIds] = useState<string[]>(profile ? [profile] : []);
  const [testCodes, setTestCodes] = useState<string[]>([]);
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [sex, setSex] = useState<LabSex>();
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);
  const [bookError, setBookError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<Booking | null>(null);
  const scroll = useRef<ScrollView>(null);

  // Asked once: what the lab needs that the profile doesn't have.
  const askDateOfBirth = !member?.dateOfBirth;
  const askSex = member?.gender !== 'male' && member?.gender !== 'female';

  // The first pod is chosen until the member picks one.
  const podId = chosenPodId ?? pods[0]?.id;

  // A test inside a chosen check is booked with it, so it never counts twice.
  const covered = coveredTests(catalog?.profiles ?? [], profileIds);
  const testCount = covered.size + testCodes.filter((code) => !covered.has(code)).length;

  const book = async (podToBook: string) => {
    const birth = askDateOfBirth ? parseDateInput(dateOfBirth) : undefined;
    if (askDateOfBirth && !birth) return setDetailsError('Enter your date of birth as DD/MM/YYYY');
    if (askSex && !sex) return setDetailsError('Choose female or male for the lab');
    setDetailsError(null);
    setBookError(null);
    setBooking(true);
    try {
      const result = await api<{ booking: Booking }>('/pod-bookings', {
        method: 'POST',
        body: {
          podId: podToBook,
          profileIds,
          testCodes: testCodes.filter((code) => !covered.has(code)),
          ...(birth && { dateOfBirth: birth }),
          ...(askSex && { sex }),
        },
      });
      setConfirmed(result.booking);
      if (member) void refreshPodBookings(member.id);
      scroll.current?.scrollTo({ y: 0, animated: true });
      // The date of birth is on the profile now; don't ask again.
      if (birth) void refreshMember();
    } catch (e) {
      setBookError(e instanceof Error ? e.message : 'Could not book. Try again.');
    } finally {
      setBooking(false);
    }
  };

  const barTop = insets.top + Spacing.two;
  const mapHeight = barTop + BAR_HEIGHT + MAP_HEIGHT;

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: clearance + Spacing.three }}>
        <View style={{ height: mapHeight }}>
          <PodMap
            pods={pods}
            selectedId={podId}
            user={userLocation}
            inset={{
              top: barTop + BAR_HEIGHT + Spacing.two,
              bottom: CARD_OVERLAP,
            }}
            onSelect={setPodId}
          />

          <View style={[styles.bar, { top: barTop }]}>
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Back to Care"
              hitSlop={6}
              style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
              <ChevronLeft size={21} color={Colors.text} strokeWidth={2.2} />
            </Pressable>
            <View style={styles.search}>
              <Search size={16} color={Colors.textMuted} strokeWidth={2.2} />
              <ThemedText style={styles.searchText} numberOfLines={1}>
                Pods near you
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.sheet}>
          {confirmed ? (
            <BookingConfirmed booking={confirmed} onDone={() => router.back()} />
          ) : catalog === null && error ? (
            <EmptyState
              icon={MapPinOff}
              title="Couldn’t load pods"
              body={error}
              action={{ label: 'Try again', icon: RotateCw, onPress: () => void refresh() }}
            />
          ) : catalog === null ? (
            <SkeletonList rows={3} leading="circle" trailing={false} label="Loading pods" />
          ) : !pods.length ? (
            <EmptyState
              icon={MapPinOff}
              title="No pods open yet"
              body="Pods appear here as soon as one near you starts taking bookings."
            />
          ) : (
            <PodBooking
              pods={pods}
              podId={podId}
              testCount={testCount}
              onSelectPod={setPodId}
              onBook={(pod) => void book(pod.id)}
              booking={booking}
              error={bookError}>
              <TestPicker
                profiles={catalog.profiles}
                tests={catalog.tests}
                profileIds={profileIds}
                testCodes={testCodes}
                onToggleProfile={(id) => {
                  setProfileIds((list) => toggle(list, id));
                  // Tests inside the check are booked with it; drop them as single picks.
                  const inside = catalog.profiles.find((item) => item.id === id)?.tests ?? [];
                  setTestCodes((list) => list.filter((item) => !inside.some((t) => t.code === item)));
                }}
                onToggleTest={(code) => setTestCodes((list) => toggle(list, code))}
              />
              <LabDetails
                askDateOfBirth={askDateOfBirth}
                askSex={askSex}
                dateOfBirth={dateOfBirth}
                sex={sex}
                onChangeDateOfBirth={setDateOfBirth}
                onChangeSex={setSex}
                error={detailsError}
              />
            </PodBooking>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.canvas,
  },
  bar: {
    position: 'absolute',
    left: Gutter,
    right: Gutter,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  // White and round with a hairline, like the back button on every other screen.
  back: {
    width: BAR_HEIGHT,
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.hairline,
    backgroundColor: Colors.backgroundElement,
    boxShadow: Shadows.soft,
  },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    height: BAR_HEIGHT,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.hairline,
    backgroundColor: Colors.backgroundElement,
    boxShadow: Shadows.soft,
  },
  searchText: {
    flexShrink: 1,
    fontFamily: Fonts.medium,
    fontSize: 14.5,
    lineHeight: 19,
    color: Colors.textSoft,
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
  sheet: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    marginTop: -CARD_OVERLAP,
    paddingHorizontal: Gutter,
  },
});
