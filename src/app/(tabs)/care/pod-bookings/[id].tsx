import { router, useLocalSearchParams } from 'expo-router';
import {
  AlertCircle,
  ArrowRightLeft,
  Check,
  CircleCheck,
  Clock,
  DoorOpen,
  Eye,
  FlaskConical,
  Info,
  SearchX,
  type LucideIcon,
} from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { ArtDish } from '@/components/ui/dish';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { IconTile } from '@/components/ui/icon-tile';
import { LIST_LEAD, ListCard, ListRow, listText } from '@/components/ui/list';
import { Section } from '@/components/ui/section';
import { SkeletonList } from '@/components/ui/skeleton';
import { Tag } from '@/components/ui/tag';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { type PodBooking } from '@/features/care/types';
import { usePodBookings } from '@/features/care/use-pod-bookings';
import { usePodCatalog } from '@/features/care/use-pod-catalog';
import { MONTHS_SHORT } from '@/features/records/record-row';

/** The Arc pod from the HealthMatrix brochure; see assets/images/home/3d/LICENSE. */
const POD_ART = require('@/assets/images/home/3d/pod.png');
const POD_ASPECT = 274 / 420;
const RADIO = 22;

const ICONS: Record<PodBooking['progress']['tone'], LucideIcon> = {
  neutral: Clock,
  success: Check,
  warning: Eye,
  danger: AlertCircle,
};

/** "2026-10-14" -> "14 Oct 2026" */
function formatDate(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return `${day} ${MONTHS_SHORT[(month ?? 1) - 1]} ${year}`;
}

/**
 * One pod booking: where it stands, the pod, and what was booked. While it still waits for the
 * member, it can move to another pod; tests can't change after booking (Mobilab doesn't allow it).
 * A booking with results opens its record instead, from the list.
 */
export default function PodBookingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { bookings, error, refresh, changePod } = usePodBookings();
  const { catalog } = usePodCatalog();
  const booking = bookings?.find((item) => item.id === id);

  const [changing, setChanging] = useState(false);
  const [picked, setPicked] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [movedTo, setMovedTo] = useState<string | null>(null);

  const back = () => (router.canGoBack() ? router.back() : router.dismissTo('/care'));

  if (!booking) {
    return (
      <Screen onBack={back} backLabel="Bookings" barTitle="Pod booking" onRefresh={refresh}>
        {bookings === null && error ? (
          <ErrorState title="Couldn’t load this booking" message={error} onRetry={() => void refresh()} />
        ) : bookings === null ? (
          <SkeletonList rows={3} leading="circle" trailing={false} label="Loading the booking" />
        ) : (
          <EmptyState
            icon={SearchX}
            title="This booking no longer exists"
            body="It may have been removed. Your other bookings are on the Care tab."
          />
        )}
      </Screen>
    );
  }

  const pods = catalog?.pods ?? [];
  const current = pods.find((pod) => pod.id === booking.pod.id);
  const choice = picked ?? booking.pod.id;
  const target = pods.find((pod) => pod.id === choice);
  const testName = (code: string) => catalog?.tests.find((test) => test.code === code)?.name ?? code;
  const what = booking.profiles.length
    ? booking.profiles.join(', ')
    : `${booking.testCount} ${booking.testCount === 1 ? 'test' : 'tests'}`;
  const waiting = booking.status === 'booked';

  const move = async () => {
    if (!target || target.id === booking.pod.id) return;
    setSaving(true);
    setMoveError(null);
    try {
      await changePod(booking.id, target.id);
      setMovedTo(target.name);
      setChanging(false);
      setPicked(undefined);
    } catch (e) {
      setMoveError(e instanceof Error ? e.message : 'Could not move the booking. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen onBack={back} backLabel="Bookings" barTitle="Pod booking" onRefresh={refresh}>
      <View style={styles.header}>
        <ThemedText style={styles.title} accessibilityRole="header">
          {what}
        </ThemedText>
        <ThemedText style={styles.provenance}>
          Booked {formatDate(booking.date)} · ID {booking.reference}
        </ThemedText>
        <View style={styles.tag}>
          <Tag
            label={booking.progress.label}
            tone={booking.progress.tone}
            icon={ICONS[booking.progress.tone]}
          />
        </View>
      </View>

      {movedTo ? (
        <View style={styles.moved} accessibilityRole="alert">
          <CircleCheck size={16} color={Colors.good} strokeWidth={2.4} />
          <ThemedText style={[styles.movedText, styles.flex]}>
            Moved to {movedTo}. Its operators can see your booking now.
          </ThemedText>
        </View>
      ) : null}

      {changing ? (
        <Section
          title="Choose another pod"
          caption="Your booking moves to that pod’s queue"
          index={1}>
          <ListCard>
            {pods.map((pod) => {
              const selected = pod.id === choice;
              const isCurrent = pod.id === booking.pod.id;
              return (
                <ListRow
                  key={pod.id}
                  leading={
                    <ArtDish art={POD_ART} artSize={LIST_LEAD * 1.16} aspect={POD_ASPECT} drop={0.15} />
                  }
                  title={pod.name}
                  subtitle={[isCurrent ? 'Current pod' : null, pod.address].filter(Boolean).join(' · ')}
                  trailing={
                    <View style={[styles.radio, selected && styles.radioSelected]}>
                      {selected ? <Check size={13} color={Colors.onInk} strokeWidth={3} /> : null}
                    </View>
                  }
                  onPress={() => setPicked(pod.id)}
                  accessibilityLabel={`${pod.name}${isCurrent ? ', current pod' : ''}${selected ? ', chosen' : ''}`}
                />
              );
            })}
          </ListCard>
          {moveError ? (
            <ThemedText style={styles.error} accessibilityRole="alert">
              {moveError}
            </ThemedText>
          ) : null}
          <View style={styles.actions}>
            <Button
              label={
                target && target.id !== booking.pod.id
                  ? `Move to ${target.name}`
                  : 'Pick a different pod'
              }
              icon={ArrowRightLeft}
              disabled={!target || target.id === booking.pod.id}
              loading={saving}
              onPress={() => void move()}
            />
            <Button
              label={`Keep ${booking.pod.name}`}
              variant="secondary"
              disabled={saving}
              onPress={() => {
                setChanging(false);
                setPicked(undefined);
                setMoveError(null);
              }}
            />
          </View>
        </Section>
      ) : (
        <Section title="Pod" index={1}>
          <ListCard>
            <ListRow
              leading={
                <ArtDish art={POD_ART} artSize={LIST_LEAD * 1.16} aspect={POD_ASPECT} drop={0.15} />
              }
              title={booking.pod.name}
              subtitle={current?.address}
              trailing={
                booking.canChangePod && pods.length > 1 ? (
                  <Pressable
                    onPress={() => {
                      setChanging(true);
                      setMovedTo(null);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Change pod"
                    hitSlop={10}
                    style={({ pressed }) => [styles.change, pressed && styles.pressed]}>
                    <ThemedText style={styles.changeText}>Change</ThemedText>
                  </Pressable>
                ) : undefined
              }
            />
            {waiting ? (
              <ListRow
                leading={<IconTile icon={DoorOpen} tone="neutral" />}
                title="No appointment needed"
                subtitle="Walk in when the pod is open and give the operator your phone number."
              />
            ) : null}
          </ListCard>
        </Section>
      )}

      <Section
        title="Tests"
        meta={`${booking.testCount} in total`}
        index={2}>
        <ListCard>
          {booking.profiles.map((name) => (
            <ListRow
              key={name}
              leading={<IconTile icon={FlaskConical} tone="neutral" />}
              title={name}
              subtitle="Health check"
            />
          ))}
          <ListRow
            leading={<IconTile icon={FlaskConical} tone="neutral" />}
            title={booking.profiles.length ? 'Every test booked' : 'Tests booked'}
            subtitle={
              <ThemedText style={listText.subtitle}>
                {booking.tests.map(testName).join(', ')}
              </ThemedText>
            }
          />
        </ListCard>
      </Section>

      {booking.recordId ? (
        <Button
          label="See results"
          onPress={() =>
            router.push({ pathname: '/records/[id]', params: { id: booking.recordId! } })
          }
        />
      ) : null}

      <View style={styles.note}>
        <View style={styles.noteIcon}>
          <Info size={14} color={Colors.textFaint} strokeWidth={2.2} />
        </View>
        <ThemedText style={[styles.noteText, styles.flex]}>
          {booking.canChangePod
            ? 'Tests can’t be changed after booking. You can move it to another pod until the pod starts on it.'
            : 'The pod has started on this booking, so it stays where it is.'}
        </ThemedText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    gap: 3,
  },
  title: {
    fontFamily: Fonts.displaySemibold,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.5,
    color: Colors.text,
  },
  provenance: {
    fontFamily: Fonts.medium,
    fontSize: 13.5,
    lineHeight: 18,
    color: Colors.textSoft,
  },
  tag: {
    flexDirection: 'row',
    marginTop: Spacing.two,
  },
  moved: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  movedText: {
    fontFamily: Fonts.semibold,
    fontSize: 13.5,
    lineHeight: 19,
    color: Colors.good,
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
  actions: {
    gap: Spacing.two,
  },
  error: {
    fontFamily: Fonts.medium,
    fontSize: 13.5,
    lineHeight: 19,
    color: Colors.high,
  },
  change: {
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  changeText: {
    fontFamily: Fonts.bold,
    fontSize: 13.5,
    lineHeight: 18,
    color: Colors.primaryDeep,
  },
  pressed: {
    opacity: 0.6,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    paddingHorizontal: Spacing.one,
  },
  noteIcon: {
    paddingTop: 1.5,
  },
  noteText: {
    fontFamily: Fonts.medium,
    fontSize: 12.5,
    lineHeight: 17,
    color: Colors.textFaint,
  },
});
