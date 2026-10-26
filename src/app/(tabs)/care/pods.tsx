import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, MapPinOff, RotateCw, Search, SearchX, X } from 'lucide-react-native';
import { useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui/empty-state';
import { glassSurface } from '@/components/ui/glass';
import { PageBackground } from '@/components/ui/morning-light';
import { SkeletonList } from '@/components/ui/skeleton';
import { Colors, Fonts, Gutter, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-context';
import { BookingConfirmed } from '@/features/care/booking-confirmed';
import { LabDetails, parseDateInput, toDateInput, type LabSex } from '@/features/care/lab-details';
import { PodBooking } from '@/features/care/pod-booking';
import { PodMap } from '@/features/care/pod-map';
import { sampleCare } from '@/features/care/sample-data';
import { coveredTests, TestPicker } from '@/features/care/test-picker';
import { type PodBooking as Booking, type Pod } from '@/features/care/types';
import { refreshPodBookings } from '@/features/care/use-pod-bookings';
import { usePodCatalog } from '@/features/care/use-pod-catalog';
import { useTabBarClearance } from '@/hooks/use-tab-bar-clearance';
import { api } from '@/services/api';

const MAP_HEIGHT = 300;
const BAR_HEIGHT = 44;
/** How far the pod card rides up over the bottom of the map. */
const CARD_OVERLAP = 44;

/**
 * Pods whose name, street or city hold every word typed, in any order and case: "doom", "clinic
 * bangalore". An empty search keeps them all.
 */
function matchPods(pods: Pod[], query: string) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return pods;
  return pods.filter((pod) => {
    const text = [pod.name, pod.address, pod.city].filter(Boolean).join(' ').toLowerCase();
    return words.every((word) => text.includes(word));
  });
}

/** `toggle(list, x)`: x added, or taken out if it was there. */
const toggle = (list: string[], code: string) =>
  list.includes(code) ? list.filter((item) => item !== code) : [...list, code];

/** "a,b" -> ["a", "b"]; nothing -> []. */
const listParam = (value?: string) => (value ? value.split(',').filter(Boolean) : []);

/**
 * Pod finder: pods on a map, the tests they run, and booking. Walk-in, so no slots: the booking
 * goes into the pod's queue and the member is tested when they arrive. Opened with
 * `?profile=<id>` from a health check on the Care tab, that check starts chosen; from a
 * prescription, `?rx=<id>&profiles=a,b&tests=x,y` starts with the doctor's tests chosen and links
 * the booking to the prescription.
 */
export default function PodsScreen() {
  const { userLocation } = sampleCare;
  const { member, refreshMember } = useAuth();
  const params = useLocalSearchParams<{
    profile?: string;
    profiles?: string;
    tests?: string;
    rx?: string;
  }>();
  const { catalog, error, refresh } = usePodCatalog();
  const pods = catalog?.pods ?? [];
  const insets = useSafeAreaInsets();
  const clearance = useTabBarClearance();

  const [query, setQuery] = useState('');
  const [chosenPodId, setPodId] = useState<string>();
  const [profileIds, setProfileIds] = useState<string[]>(() => [
    ...new Set([...listParam(params.profile), ...listParam(params.profiles)]),
  ]);
  const [testCodes, setTestCodes] = useState<string[]>(() => listParam(params.tests));
  const [dateOfBirth, setDateOfBirth] = useState('');
  // Correcting a date of birth already on file, from the details section.
  const [changingBirth, setChangingBirth] = useState(false);
  const [sex, setSex] = useState<LabSex>();
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);
  const [bookError, setBookError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<Booking | null>(null);
  const scroll = useRef<ScrollViewInstance>(null);

  // Asked once: what the lab needs that the profile doesn't have.
  const askDateOfBirth = !member?.dateOfBirth || changingBirth;
  const askSex = member?.gender !== 'male' && member?.gender !== 'female';

  // The map and the list show the pods the search matches.
  const shown = matchPods(pods, query);
  // The first pod shown is chosen until the member picks one; a search that hides the chosen pod
  // moves the choice to the first match.
  const podId = shown.some((pod) => pod.id === chosenPodId) ? chosenPodId : shown[0]?.id;

  // A test inside a chosen check is booked with it, so it never counts twice.
  const covered = coveredTests(catalog?.profiles ?? [], profileIds);
  const testCount = covered.size + testCodes.filter((code) => !covered.has(code)).length;

  const book = async (podToBook: string) => {
    const birth = askDateOfBirth ? parseDateInput(dateOfBirth) : undefined;
    if (askDateOfBirth && !birth) return setDetailsError('Enter your date of birth as DD/MM/YYYY');
    if (askSex && !sex) return setDetailsError('Choose your gender');
    setDetailsError(null);
    setBookError(null);
    setBooking(true);
    try {
      const result = await api<{ booking: Booking }>('/pod-bookings', {
        method: 'POST',
        body: {
          podId: podToBook,
          // A check or test the doctor ordered that the pods no longer offer can't be sent.
          profileIds: profileIds.filter((id) =>
            (catalog?.profiles ?? []).some((item) => item.id === id),
          ),
          testCodes: testCodes.filter(
            (code) =>
              !covered.has(code) && (catalog?.tests ?? []).some((test) => test.code === code),
          ),
          ...(params.rx && { prescriptionId: params.rx }),
          ...(birth && { dateOfBirth: birth }),
          ...(askSex && { sex }),
        },
      });
      setConfirmed(result.booking);
      if (member) void refreshPodBookings(member.id);
      scroll.current?.scrollTo({ y: 0, animated: true });
      // The date of birth, and a gender the profile lacked, are on the profile now; don't ask again.
      setChangingBirth(false);
      if (birth || (askSex && !member?.gender)) void refreshMember();
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
      <PageBackground />
      <ScrollView
        ref={scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: clearance + Spacing.three }}>
        <View style={{ height: mapHeight }}>
          <PodMap
            pods={shown}
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
              style={({ pressed }) => [glassSurface.small, styles.back, pressed && styles.pressed]}>
              <ChevronLeft size={21} color={Colors.text} strokeWidth={2.2} />
            </Pressable>
            <View style={[glassSurface.small, styles.search]}>
              <Search size={16} color={Colors.textMuted} strokeWidth={2.2} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search pods by name or area"
                placeholderTextColor={Colors.textMuted}
                returnKeyType="search"
                autoCorrect={false}
                autoCapitalize="none"
                accessibilityLabel="Search pods"
                style={styles.searchInput}
              />
              {query ? (
                <Pressable
                  onPress={() => setQuery('')}
                  accessibilityRole="button"
                  accessibilityLabel="Clear search"
                  hitSlop={10}
                  style={({ pressed }) => [styles.clear, pressed && styles.pressed]}>
                  <X size={13} color={Colors.textSoft} strokeWidth={2.6} />
                </Pressable>
              ) : null}
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
          ) : !shown.length ? (
            <EmptyState
              icon={SearchX}
              title={`No pods match “${query.trim()}”`}
              body="Try a pod’s name, its street or your city."
              action={{ label: 'Clear search', icon: X, onPress: () => setQuery('') }}
            />
          ) : (
            <PodBooking
              pods={shown}
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
                savedDateOfBirth={member?.dateOfBirth}
                onChangeSavedDateOfBirth={() => {
                  if (member?.dateOfBirth) setDateOfBirth(toDateInput(member.dateOfBirth));
                  setChangingBirth(true);
                }}
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
  },
  bar: {
    position: 'absolute',
    left: Gutter,
    right: Gutter,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  // A round of glass over the map, like the back button on every other screen.
  back: {
    width: BAR_HEIGHT,
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // A pill of glass: the map blurs behind it on web.
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    height: BAR_HEIGHT,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    height: BAR_HEIGHT,
    fontFamily: Fonts.medium,
    fontSize: 14.5,
    color: Colors.text,
    // The pill is the field; no second outline from the browser on web.
    outlineStyle: 'solid',
    outlineWidth: 0,
  },
  clear: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.well,
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
