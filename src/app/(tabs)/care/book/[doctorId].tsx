import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { CalendarCheck, Check, Clock, Lock, Send, Video } from 'lucide-react-native';
import { useCallback, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { ErrorState } from '@/components/ui/empty-state';
import { Segmented } from '@/components/ui/segmented';
import { Skeleton, SkeletonCircle, SkeletonGroup } from '@/components/ui/skeleton';
import { StackHeader } from '@/components/ui/stack-header';
import { Surface } from '@/components/ui/surface';
import { TextField } from '@/components/ui/text-field';
import { Colors, Fonts, Gradients, MaxContentWidth, Radius, Shadows, Spacing } from '@/constants/theme';
import { CustomTimeInput } from '@/features/doctors/custom-time-input';
import { DoctorAvatar } from '@/features/doctors/doctor-avatar';
import { isSpecialty, specialtyLabel } from '@/features/doctors/specialties';
import { formatSlot, istInstant, istParts, istToday } from '@/features/doctors/time';
import {
  type Appointment,
  type ConsultRequest,
  type DoctorWithSlots,
  type Slot,
  type SlotDay,
  type Specialty,
} from '@/features/doctors/types';
import { useAppointments } from '@/features/doctors/use-appointments';
import { useConsultRequests } from '@/features/doctors/use-consult-requests';
import { useNow } from '@/features/reminders/use-now';
import {
  formatDay,
  formatTime,
  fromDateKey,
  partOfDay,
  WEEKDAY_NAMES,
} from '@/features/reminders/schedule';
import { useRefreshControl } from '@/hooks/use-refresh-control';
import { useTabBarClearance } from '@/hooks/use-tab-bar-clearance';
import { ApiError, api } from '@/services/api';

/** Slots split into morning, afternoon and evening, keeping their order. */
function groupSlots(slots: Slot[]) {
  const groups: { title: string; slots: Slot[] }[] = [];
  for (const slot of slots) {
    const title = partOfDay(slot.time);
    const last = groups.at(-1);
    if (last?.title === title) last.slots.push(slot);
    else groups.push({ title, slots: [slot] });
  }
  return groups;
}

/** The day button's last line: free count, or why there is nothing to book. */
function dayStatus(day: SlotDay, free: number) {
  if (free) return `${free} free`;
  if (day.off === 'weekly') return 'Day off';
  if (day.off === 'time_off') return 'Away';
  if (day.off === 'paused') return 'Paused';
  return 'Full';
}

/** Why the chosen day has no times to show. */
function emptyDayText(day: SlotDay | undefined) {
  if (day?.off === 'weekly') return 'The doctor doesn’t consult on this day. Pick another day.';
  if (day?.off === 'time_off') return 'The doctor is away on this day. Pick another day.';
  if (day?.off === 'paused') return 'The doctor isn’t taking bookings right now.';
  return 'No slots left on this day. Pick another day.';
}

/** How often the open screen reloads the doctor's free times. */
const SLOTS_REFRESH_MS = 60_000;

/** Booking one of the doctor's open slots, or asking them for a time of the member's own. */
type Mode = 'slots' | 'request';

/** The earliest day and "HH:mm" a custom time can be asked for: the next whole minute. */
function earliestRequestTime(now: Date) {
  // The next whole minute: at 3:24:10 that's 3:25.
  const at = new Date(Math.floor(now.getTime() / 60_000) * 60_000 + 60_000);
  const { date, time } = istParts(at);
  return { date, time };
}

/** Book a video consult with one doctor: pick a day, a time, and say what it's about. */
export default function BookDoctorScreen() {
  const { doctorId, specialty: wanted } = useLocalSearchParams<{
    doctorId: string;
    specialty?: string;
  }>();
  const { book } = useAppointments();
  const { send: sendRequest } = useConsultRequests();
  const now = useNow();
  const clearance = useTabBarClearance();

  const [data, setData] = useState<DoctorWithSlots | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [specialty, setSpecialty] = useState<Specialty | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [slotAt, setSlotAt] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booked, setBooked] = useState<Appointment | null>(null);
  const [mode, setMode] = useState<Mode>('slots');
  const [requestTime, setRequestTime] = useState<string | null>(null);
  const [requested, setRequested] = useState<ConsultRequest | null>(null);

  /** Loads the doctor and free slots; `isActive` drops the answer once the screen has moved on. */
  const load = useCallback(
    (isActive: () => boolean) =>
      api<DoctorWithSlots>(`/doctors/${doctorId}`)
        .then((next) => {
          if (!isActive()) return;
          setData(next);
          setLoadError(null);
          // Keep the chosen day if it still has room, otherwise jump to the first free day.
          setDate((current) => {
            const keep = next.days.find(
              (day) => day.date === current && day.slots.some((s) => s.available),
            );
            return (
              keep?.date ??
              next.days.find((day) => day.slots.some((s) => s.available))?.date ??
              next.days[0]?.date ??
              null
            );
          });
          // Keep the chosen time while it is still free; a freed-up list can also take it away.
          setSlotAt((current) =>
            current &&
            next.days.some((day) => day.slots.some((s) => s.at === current && s.available))
              ? current
              : null,
          );
          setSpecialty((current) => {
            if (current) return current;
            const bookable = next.doctor.specialties.filter(isSpecialty);
            return bookable.find((id) => id === wanted) ?? bookable[0] ?? null;
          });
        })
        .catch((e: unknown) => {
          if (isActive()) {
            setLoadError(e instanceof Error ? e.message : 'Could not load this doctor');
          }
        }),
    [doctorId, wanted],
  );

  // Free time changes as consults end early or run over, so load again whenever the screen comes
  // back into view and every minute while it stays open.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      void load(() => active);
      const timer = setInterval(() => void load(() => active), SLOTS_REFRESH_MS);
      return () => {
        active = false;
        clearInterval(timer);
      };
    }, [load]),
  );

  const reload = () => load(() => true);
  const refreshControl = useRefreshControl(reload);

  const back = () => (router.canGoBack() ? router.back() : router.dismissTo('/care'));

  if (requested) {
    return (
      <Shell title="Request sent" onBack={() => router.dismissTo('/care')} close>
        <RequestSent request={requested} />
      </Shell>
    );
  }

  if (booked) {
    return (
      <Shell title="Booked" onBack={() => router.dismissTo('/care')} close>
        <Confirmation appointment={booked} />
      </Shell>
    );
  }

  if (!data) {
    return (
      <Shell title="Book appointment" onBack={back}>
        <View style={styles.content}>
          {loadError ? (
            <ErrorState
              title="Couldn’t load this doctor"
              message={loadError}
              onRetry={() => void reload()}
            />
          ) : (
            <BookingSkeleton />
          )}
        </View>
      </Shell>
    );
  }

  const { doctor, days, slotMinutes } = data;
  const bookable = doctor.specialties.filter(isSpecialty);
  const today = istToday();
  const day = days.find((d) => d.date === date);
  const chosen = day?.slots.find((slot) => slot.at === slotAt && slot.available);
  const soonest = earliestRequestTime(now);
  // Today, the time must still be ahead; the minute after now is offered to start with.
  const requestPassed =
    !!date &&
    !!requestTime &&
    (date < soonest.date || (date === soonest.date && requestTime < soonest.time));
  const requestTimeError = !requestTime
    ? 'Enter a time, like 3:25 PM.'
    : requestPassed
      ? `That time has passed. Pick ${formatTime(soonest.time)} or later.`
      : null;
  const requestAt =
    date && requestTime && !requestPassed ? istInstant(date, requestTime) : null;
  const canSubmit = mode === 'slots' ? !!chosen : !!requestAt;

  const switchMode = (next: Mode) => {
    setMode(next);
    setSlotAt(null);
    setRequestTime(next === 'request' ? soonest.time : null);
    setError(null);
  };

  const request = async () => {
    if (!requestAt || !specialty) return;
    setBusy(true);
    setError(null);
    try {
      setRequested(
        await sendRequest({
          doctorId: doctor.id,
          specialty,
          requestedAt: requestAt,
          reason: reason.trim() || undefined,
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send the request. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!chosen || !specialty) return;
    setBusy(true);
    setError(null);
    try {
      setBooked(
        await book({
          doctorId: doctor.id,
          specialty,
          scheduledAt: chosen.at,
          reason: reason.trim() || undefined,
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not book. Try again.');
      // Someone else took the slot: show the latest free times.
      if (e instanceof ApiError && (e.status === 409 || e.status === 400)) {
        setSlotAt(null);
        void reload();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell title="Book appointment" onBack={back}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={refreshControl}
          contentContainerStyle={[styles.content, { paddingBottom: clearance + Spacing.three }]}>
          <Surface style={styles.doctor}>
            <DoctorAvatar name={doctor.name} photoUrl={doctor.photoUrl} size={56} />
            <View style={styles.flex}>
              <ThemedText style={styles.doctorName} numberOfLines={1}>
                {doctor.name}
              </ThemedText>
              {doctor.qualifications ? (
                <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
                  {doctor.qualifications}
                </ThemedText>
              ) : null}
              <View style={styles.mode}>
                <Video size={13} color={Colors.success} strokeWidth={2.4} />
                <ThemedText type="caption" themeColor="success" style={styles.modeText}>
                  Video consult · {slotMinutes} min
                </ThemedText>
              </View>
            </View>
          </Surface>

          {doctor.about ? (
            <Surface style={styles.section}>
              <ThemedText type="bodyBold">About the doctor</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {doctor.about}
              </ThemedText>
            </Surface>
          ) : null}

          {bookable.length > 1 ? (
            <Section title="Consult for">
              <View style={styles.wrap}>
                {bookable.map((id) => (
                  <Chip
                    key={id}
                    label={specialtyLabel(id)}
                    selected={specialty === id}
                    onPress={() => setSpecialty(id)}
                  />
                ))}
              </View>
            </Section>
          ) : null}

          <Section title="Choose a day" step={1}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.daysScroll}
              contentContainerStyle={styles.days}>
              {days.map((d) => {
                const free = d.slots.filter((slot) => slot.available).length;
                const selected = d.date === date;
                const weekday =
                  d.date === today ? 'Today' : WEEKDAY_NAMES[fromDateKey(d.date).getDay()];
                return (
                  <Pressable
                    key={d.date}
                    onPress={() => {
                      setDate(d.date);
                      setSlotAt(null);
                      setRequestTime(mode === 'request' ? soonest.time : null);
                      setError(null);
                    }}
                    disabled={mode === 'slots' && !free}
                    accessibilityRole="button"
                    accessibilityState={{ selected, disabled: mode === 'slots' && !free }}
                    accessibilityLabel={`${formatDay(d.date, today)}, ${free ? `${free} free slots` : dayStatus(d, free).toLowerCase()}`}
                    style={({ pressed }) => [
                      styles.day,
                      selected && styles.daySelected,
                      mode === 'slots' && !free && styles.dayFull,
                      pressed && styles.pressed,
                    ]}>
                    <ThemedText type="caption" themeColor={selected ? 'onInk' : 'textSecondary'}>
                      {weekday}
                    </ThemedText>
                    <ThemedText style={[styles.dayNumber, selected && styles.onInk]}>
                      {fromDateKey(d.date).getDate()}
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      themeColor={selected ? 'onInk' : free ? 'success' : 'textMuted'}>
                      {dayStatus(d, free)}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Section>

          <Section
            title={mode === 'slots' ? 'Choose a time' : 'Ask for a time'}
            hint="India time (IST)"
            step={2}>
            <Segmented
              value={mode}
              onChange={switchMode}
              options={[
                { value: 'slots', label: 'Open slots', icon: CalendarCheck },
                { value: 'request', label: 'Custom time', icon: Clock },
              ]}
            />
            {mode === 'request' ? (
              <>
                <View style={styles.requestNote}>
                  <Clock size={15} color={Colors.primary} strokeWidth={2.2} />
                  <ThemedText type="caption" themeColor="textSecondary" style={styles.flex}>
                    Ask {doctor.name} for any time on the day you picked above. Nothing is booked
                    until they confirm; you’ll see their answer under Your consults in Care.
                  </ThemedText>
                </View>
                {date ? (
                  <CustomTimeInput
                    // A new day starts again from the minute after now.
                    key={date}
                    initial={soonest.time}
                    onChange={(time) => {
                      setRequestTime(time);
                      setError(null);
                    }}
                    error={requestTimeError}
                  />
                ) : null}
              </>
            ) : day && day.slots.length ? (
              groupSlots(day.slots).map((group) => (
                <View key={group.title} style={styles.group}>
                  <ThemedText type="caption" themeColor="textSecondary" style={styles.groupTitle}>
                    {group.title}
                  </ThemedText>
                  <View style={styles.slots}>
                    {group.slots.map((slot) => {
                      const selected = slot.at === slotAt;
                      return (
                        <Pressable
                          key={slot.at}
                          onPress={() => {
                            setSlotAt(slot.at);
                            setError(null);
                          }}
                          disabled={!slot.available}
                          accessibilityRole="radio"
                          accessibilityState={{ checked: selected, disabled: !slot.available }}
                          accessibilityLabel={`${formatTime(slot.time)}${slot.available ? '' : ', booked'}`}
                          style={({ pressed }) => [
                            styles.slot,
                            selected && styles.slotSelected,
                            !slot.available && styles.slotTaken,
                            pressed && styles.pressed,
                          ]}>
                          <ThemedText
                            type="smallBold"
                            themeColor={selected ? 'onInk' : slot.available ? 'text' : 'textMuted'}
                            style={!slot.available && styles.struck}>
                            {formatTime(slot.time)}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))
            ) : (
              <ThemedText type="small" themeColor="textSecondary">
                {emptyDayText(day)}
              </ThemedText>
            )}
          </Section>

          <Section
            title="What would you like to discuss?"
            hint="Optional. Helps the doctor prepare."
            step={3}>
            <TextField
              value={reason}
              onChangeText={setReason}
              placeholder="e.g. Chest pain on climbing stairs for a week"
              accessibilityLabel="What would you like to discuss?"
              maxLength={300}
              multiline
              editable={!busy}
            />
          </Section>

          <View style={styles.note}>
            <Lock size={14} color={Colors.textSecondary} strokeWidth={2.2} />
            <ThemedText type="caption" themeColor="textSecondary" style={styles.flex}>
              The doctor sees your health records only after you approve with your OTP.
            </ThemedText>
          </View>

          {error ? (
            <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite">
              {error}
            </ThemedText>
          ) : null}

          <Pressable
            onPress={mode === 'slots' ? confirm : request}
            disabled={!canSubmit || busy}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSubmit || busy, busy }}
            style={({ pressed }) => [
              styles.book,
              !canSubmit && styles.bookDisabled,
              pressed && styles.pressed,
            ]}>
            {busy ? (
              <ActivityIndicator color={Colors.onInk} />
            ) : mode === 'slots' ? (
              <>
                <ThemedText type="smallBold" themeColor="onInk">
                  {chosen ? 'Confirm booking' : 'Pick a time to continue'}
                </ThemedText>
                {chosen ? (
                  <ThemedText type="caption" style={styles.bookSub}>
                    {formatSlot(chosen.at)}
                  </ThemedText>
                ) : null}
              </>
            ) : (
              <>
                <View style={styles.sendRow}>
                  {requestAt ? <Send size={15} color={Colors.onInk} strokeWidth={2.4} /> : null}
                  <ThemedText type="smallBold" themeColor="onInk">
                    {requestAt ? `Send request to ${doctor.name}` : 'Pick a day and time'}
                  </ThemedText>
                </View>
                {requestAt ? (
                  <ThemedText type="caption" style={styles.bookSub}>
                    {formatSlot(requestAt)}
                  </ThemedText>
                ) : null}
              </>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Shell>
  );
}

function Confirmation({ appointment }: { appointment: Appointment }) {
  return (
    <View style={styles.done}>
      <SuccessBadge>
        <Check size={40} color={Colors.onInk} strokeWidth={3} />
      </SuccessBadge>
      <ThemedText style={styles.doneTitle}>You’re booked</ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
        Your video consult is confirmed. You’ll find it under Your consults in Care, and on Home.
      </ThemedText>

      <Surface style={styles.doneCard}>
        {appointment.doctor ? (
          <View style={styles.doctorRow}>
            <DoctorAvatar
              name={appointment.doctor.name}
              photoUrl={appointment.doctor.photoUrl}
              size={44}
            />
            <View style={styles.flex}>
              <ThemedText type="bodyBold">{appointment.doctor.name}</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                {specialtyLabel(appointment.specialty)}
              </ThemedText>
            </View>
          </View>
        ) : null}
        <View style={styles.doneRow}>
          <CalendarCheck size={16} color={Colors.primary} strokeWidth={2.2} />
          <ThemedText type="smallBold">{formatSlot(appointment.scheduledAt)}</ThemedText>
        </View>
        <View style={styles.doneRow}>
          <Video size={16} color={Colors.primary} strokeWidth={2.2} />
          <ThemedText type="small">Video consult in the app</ThemedText>
        </View>
        {appointment.reason ? (
          <ThemedText type="caption" themeColor="textSecondary">
            “{appointment.reason}”
          </ThemedText>
        ) : null}
      </Surface>

      <View style={styles.doneButton}>
        <Button label="Done" onPress={() => router.dismissTo('/care')} />
      </View>
    </View>
  );
}

function RequestSent({ request }: { request: ConsultRequest }) {
  return (
    <View style={styles.done}>
      <SuccessBadge tone="brand">
        <Send size={34} color={Colors.onInk} strokeWidth={2.4} />
      </SuccessBadge>
      <ThemedText style={styles.doneTitle}>Request sent</ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
        {request.doctor?.name ?? 'The doctor'} will confirm or decline. If they confirm, it’s
        booked and shows under Your consults in Care. If not, you can pick one of their open
        slots.
      </ThemedText>

      <Surface style={styles.doneCard}>
        {request.doctor ? (
          <View style={styles.doctorRow}>
            <DoctorAvatar name={request.doctor.name} photoUrl={request.doctor.photoUrl} size={44} />
            <View style={styles.flex}>
              <ThemedText type="bodyBold">{request.doctor.name}</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                {specialtyLabel(request.specialty)}
              </ThemedText>
            </View>
          </View>
        ) : null}
        <View style={styles.doneRow}>
          <Clock size={16} color={Colors.primary} strokeWidth={2.2} />
          <ThemedText type="smallBold">{formatSlot(request.requestedAt)}</ThemedText>
        </View>
        <View style={styles.doneRow}>
          <Video size={16} color={Colors.primary} strokeWidth={2.2} />
          <ThemedText type="small">Waiting for the doctor to confirm</ThemedText>
        </View>
        {request.reason ? (
          <ThemedText type="caption" themeColor="textSecondary">
            “{request.reason}”
          </ThemedText>
        ) : null}
      </Surface>

      <View style={styles.doneButton}>
        <Button label="Done" onPress={() => router.dismissTo('/care')} />
      </View>
    </View>
  );
}

/** The page around each step: a warm wash, a back (or close) bar, then the content. */
function Shell({
  title,
  onBack,
  close = false,
  children,
}: {
  title: string;
  onBack: () => void;
  /** Done screens close back to Care rather than stepping back. */
  close?: boolean;
  children: ReactNode;
}) {
  return (
    <ThemedView style={styles.container}>
      <LinearGradient
        colors={['rgba(254, 241, 234, 0.9)', 'rgba(243, 247, 247, 0)']}
        style={styles.wash}
        pointerEvents="none"
      />
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StackHeader
          onBack={onBack}
          backLabel={close ? 'Care' : undefined}
          title={title}
          close={close}
        />
        {children}
      </SafeAreaView>
    </ThemedView>
  );
}

/** One step of the booking, numbered, on a white card. */
function Section({
  title,
  hint,
  step,
  children,
}: {
  title: string;
  hint?: string;
  step?: number;
  children: ReactNode;
}) {
  return (
    <Surface style={styles.section}>
      <View style={styles.sectionHeader}>
        {step ? (
          <View style={styles.step}>
            <ThemedText style={styles.stepText}>{step}</ThemedText>
          </View>
        ) : null}
        <View style={styles.flex}>
          <ThemedText type="bodyBold">{title}</ThemedText>
          {hint ? (
            <ThemedText type="caption" themeColor="textSecondary">
              {hint}
            </ThemedText>
          ) : null}
        </View>
      </View>
      {children}
    </Surface>
  );
}

/** A big round icon on soft rings, for the done screens. */
function SuccessBadge({ tone = 'success', children }: { tone?: 'success' | 'brand'; children: ReactNode }) {
  const soft = tone === 'success' ? Colors.successSoft : Colors.primarySoft;
  return (
    <View style={[styles.ringOuter, { backgroundColor: soft }]}>
      <View style={styles.ringInner}>
        <View style={styles.badgeClip}>
          <LinearGradient
            colors={tone === 'success' ? [Colors.teal, Colors.success] : Gradients.brand}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {/* In a View, so the icon paints above the gradient on web too. */}
          <View>{children}</View>
        </View>
      </View>
    </View>
  );
}

/** The doctor card, days and slots while the doctor loads. */
function BookingSkeleton() {
  return (
    <SkeletonGroup label="Loading free times" style={styles.skeletonStack}>
      <Surface style={styles.doctor}>
        <SkeletonCircle size={56} />
        <View style={styles.flex}>
          <Skeleton width="55%" height={16} />
          <Skeleton width="40%" height={11} style={styles.skeletonGap} />
        </View>
      </Surface>
      <Surface style={styles.section}>
        <Skeleton width={140} height={16} />
        <View style={styles.days}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} width={66} height={82} radius={Radius.lg} />
          ))}
        </View>
      </Surface>
      <Surface style={styles.section}>
        <Skeleton width={120} height={16} />
        <Skeleton height={48} radius={Radius.pill} />
        <View style={styles.slots}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} width="30%" height={44} radius={Radius.pill} />
          ))}
        </View>
      </Surface>
    </SkeletonGroup>
  );
}

const styles = StyleSheet.create({
  requestNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    padding: 12,
    borderRadius: Radius.md,
    backgroundColor: Colors.primarySoft,
  },
  sendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  container: {
    flex: 1,
    alignItems: 'center',
  },
  wash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 280,
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth / 1.5,
  },
  flex: {
    flex: 1,
  },
  center: {
    textAlign: 'center',
  },
  onInk: {
    color: Colors.onInk,
  },
  pressed: {
    opacity: 0.75,
  },
  content: {
    gap: Spacing.three,
    padding: Spacing.three,
    paddingTop: Spacing.one,
  },
  skeletonGap: {
    marginTop: 8,
  },
  skeletonStack: {
    gap: Spacing.three,
  },
  doctor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
  },
  doctorName: {
    fontFamily: Fonts.display,
    fontSize: 18,
    lineHeight: 23,
  },
  mode: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    marginTop: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: Radius.pill,
    backgroundColor: Colors.successSoft,
  },
  modeText: {
    fontFamily: Fonts.semibold,
  },
  section: {
    gap: Spacing.three - 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 2,
  },
  step: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.ink,
  },
  stepText: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    lineHeight: 16,
    color: Colors.onInk,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  // Bleed to the card edges so the days scroll under its padding.
  daysScroll: {
    marginHorizontal: -Spacing.three,
  },
  days: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: 2,
  },
  day: {
    width: 66,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 10,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
  },
  daySelected: {
    borderColor: Colors.ink,
    backgroundColor: Colors.ink,
    boxShadow: '0 8px 18px rgba(14, 42, 51, 0.25)',
  },
  dayFull: {
    opacity: 0.45,
  },
  dayNumber: {
    fontFamily: Fonts.display,
    fontSize: 22,
    lineHeight: 28,
    color: Colors.text,
  },
  group: {
    gap: Spacing.two,
  },
  groupTitle: {
    fontFamily: Fonts.semibold,
  },
  slots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  slot: {
    width: '31%',
    flexGrow: 1,
    maxWidth: '33%',
    alignItems: 'center',
    paddingVertical: 11,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
  },
  slotSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
    boxShadow: Shadows.glow,
  },
  slotTaken: {
    backgroundColor: Colors.background,
  },
  struck: {
    textDecorationLine: 'line-through',
  },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.one,
  },
  book: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
    paddingVertical: 9,
    borderRadius: Radius.xl,
    backgroundColor: Colors.primary,
    boxShadow: Shadows.glow,
  },
  bookDisabled: {
    opacity: 0.45,
    boxShadow: 'none',
  },
  bookSub: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  done: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
    paddingTop: Spacing.four,
  },
  doneTitle: {
    fontFamily: Fonts.display,
    fontSize: 28,
    lineHeight: 34,
    textAlign: 'center',
  },
  ringOuter: {
    width: 132,
    height: 132,
    borderRadius: 66,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringInner: {
    width: 108,
    height: 108,
    borderRadius: 54,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundElement,
  },
  badgeClip: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  doneCard: {
    alignSelf: 'stretch',
    gap: Spacing.two + 4,
  },
  doctorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 4,
  },
  doneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  doneButton: {
    alignSelf: 'stretch',
  },
});
