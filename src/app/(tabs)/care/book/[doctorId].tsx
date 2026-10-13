import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  AlertCircle,
  CalendarCheck,
  Check,
  Clock,
  Info,
  Lock,
  MessageSquareText,
  Send,
  Video,
  type LucideIcon,
} from 'lucide-react-native';
import { useCallback, useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { ErrorState } from '@/components/ui/empty-state';
import { IconTile } from '@/components/ui/icon-tile';
import { Divided, LIST_LEAD, ListRow, listText } from '@/components/ui/list';
import { PageBackground } from '@/components/ui/morning-light';
import { Section } from '@/components/ui/section';
import { Segmented } from '@/components/ui/segmented';
import { Skeleton, SkeletonCircle, SkeletonGroup } from '@/components/ui/skeleton';
import { StackHeader } from '@/components/ui/stack-header';
import { Surface } from '@/components/ui/surface';
import { TextField } from '@/components/ui/text-field';
import {
  Colors,
  Fonts,
  Gradients,
  Gutter,
  MaxContentWidth,
  Radius,
  Shadows,
  Spacing,
} from '@/constants/theme';
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
import { useKeyboardVisible } from '@/hooks/use-keyboard-visible';
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
  const keyboardVisible = useKeyboardVisible();

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
  // The pinned button's height, so the last field can scroll clear of it.
  const [footerHeight, setFooterHeight] = useState(0);

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
      <Shell onBack={() => router.dismissTo('/care')} close>
        <RequestSent request={requested} />
      </Shell>
    );
  }

  if (booked) {
    return (
      <Shell onBack={() => router.dismissTo('/care')} close>
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

  // The pinned button: what it does, and the time it is for once there is one.
  const cta =
    mode === 'slots'
      ? {
          label: chosen ? 'Confirm booking' : 'Pick a time to continue',
          icon: chosen ? CalendarCheck : undefined,
          summary: chosen ? formatSlot(chosen.at) : null,
          onPress: confirm,
        }
      : {
          label: requestAt ? `Send request to ${doctor.name}` : 'Pick a day and time',
          icon: requestAt ? Send : undefined,
          summary: requestAt ? formatSlot(requestAt) : null,
          onPress: request,
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
          contentContainerStyle={[
            styles.content,
            { paddingBottom: footerHeight + Spacing.four },
          ]}>
          <Surface style={styles.doctor}>
            <View style={styles.doctorTop}>
              <DoctorAvatar name={doctor.name} photoUrl={doctor.photoUrl} size={52} />
              <View style={styles.flex}>
                <ThemedText style={styles.doctorName} numberOfLines={1}>
                  {doctor.name}
                </ThemedText>
                {doctor.qualifications ? (
                  <ThemedText style={styles.doctorLine} numberOfLines={1}>
                    {doctor.qualifications}
                  </ThemedText>
                ) : null}
                <View style={styles.mode}>
                  <Video size={13} color={Colors.primary} strokeWidth={2.4} />
                  <ThemedText style={styles.modeText} numberOfLines={1}>
                    Video consult · {slotMinutes} min
                  </ThemedText>
                </View>
              </View>
            </View>
            {doctor.about ? (
              <>
                <View style={styles.rule} />
                <View style={styles.about}>
                  <ThemedText style={styles.aboutTitle}>About the doctor</ThemedText>
                  <ThemedText style={styles.aboutText}>{doctor.about}</ThemedText>
                </View>
              </>
            ) : null}
          </Surface>

          {bookable.length > 1 ? (
            <Section title="Consult for" index={0}>
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

          <Section title="Choose a day" index={1}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.daysScroll}
              contentContainerStyle={styles.days}>
              {days.map((d) => {
                const free = d.slots.filter((slot) => slot.available).length;
                const selected = d.date === date;
                const closed = mode === 'slots' && !free;
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
                    disabled={closed}
                    accessibilityRole="button"
                    accessibilityState={{ selected, disabled: closed }}
                    accessibilityLabel={`${formatDay(d.date, today)}, ${free ? `${free} free slots` : dayStatus(d, free).toLowerCase()}`}
                    style={({ pressed }) => [
                      styles.day,
                      selected && styles.daySelected,
                      closed && !selected && styles.dayClosed,
                      pressed && styles.pressed,
                    ]}>
                    <ThemedText style={[styles.dayWeekday, selected && styles.onInkSoft]}>
                      {weekday}
                    </ThemedText>
                    <ThemedText style={[styles.dayNumber, selected && styles.onInk]}>
                      {fromDateKey(d.date).getDate()}
                    </ThemedText>
                    <ThemedText
                      style={[styles.dayStatus, selected && styles.onInkSoft]}
                      numberOfLines={1}>
                      {dayStatus(d, free)}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Section>

          <Section
            title={mode === 'slots' ? 'Choose a time' : 'Ask for a time'}
            meta="India time (IST)"
            index={2}>
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
                <View style={styles.note}>
                  <Info size={15} color={Colors.textFaint} strokeWidth={2.2} />
                  <ThemedText style={[styles.noteText, styles.flex]}>
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
                  <ThemedText style={styles.groupTitle}>{group.title}</ThemedText>
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
                            style={[
                              styles.slotText,
                              selected && styles.onInk,
                              !slot.available && styles.slotTakenText,
                            ]}>
                            {formatTime(slot.time)}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))
            ) : (
              <ThemedText style={styles.empty}>{emptyDayText(day)}</ThemedText>
            )}
          </Section>

          <Section
            title="What would you like to discuss?"
            caption="Optional. Helps the doctor prepare."
            index={3}>
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

          <View style={styles.trust}>
            <Lock size={13} color={Colors.textFaint} strokeWidth={2.2} style={styles.trustIcon} />
            <ThemedText style={styles.trustText}>
              The doctor sees your health records only after you approve with your OTP.
            </ThemedText>
          </View>
        </ScrollView>

        {/* Pinned over the bottom of the page: the page fades out under the button. */}
        <View
          onLayout={(event) => setFooterHeight(event.nativeEvent.layout.height)}
          style={[
            styles.footer,
            { paddingBottom: keyboardVisible ? Spacing.two + 4 : clearance + Spacing.two + 4 },
          ]}>
          <LinearGradient
            colors={['rgba(248, 245, 240, 0)', Colors.canvas]}
            style={[styles.fade, styles.noTouch]}
          />
          {error ? (
            <View style={styles.error} accessibilityLiveRegion="polite">
              <AlertCircle size={15} color={Colors.high} strokeWidth={2.4} />
              <ThemedText style={styles.errorText}>{error}</ThemedText>
            </View>
          ) : cta.summary ? (
            <ThemedText style={styles.summary} numberOfLines={1}>
              {cta.summary}
            </ThemedText>
          ) : null}
          <Button
            label={cta.label}
            icon={cta.icon}
            // Quiet white until there is something to book, then the one orange thing on the page.
            variant={canSubmit ? 'primary' : 'secondary'}
            onPress={cta.onPress}
            disabled={!canSubmit}
            loading={busy}
          />
        </View>
      </KeyboardAvoidingView>
    </Shell>
  );
}

/** A round dish at the top of a done screen: a check in the "good" colour, or a sent request. */
function DoneBadge({ icon: Icon, good }: { icon: LucideIcon; good?: boolean }) {
  return (
    // The shadow sits outside; a plain View rounds and clips the tint.
    <View style={styles.badgeShadow}>
      <View style={[styles.badge, good && styles.badgeGood]}>
        {good ? null : (
          <LinearGradient
            colors={Gradients.dish}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        )}
        {/* A layer of its own, so it paints above the gradient on web too. */}
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          <Icon size={30} color={good ? Colors.good : Colors.primaryDeep} strokeWidth={2.6} />
        </View>
      </View>
    </View>
  );
}

/**
 * A done screen: one white card with the badge, what happened, and the consult's lines under a
 * hairline (the doctor, when, what it's about), then Done.
 */
function Done({
  badge,
  title,
  body,
  doctor,
  specialty,
  when,
  whenIcon,
  whenDetail,
  reason,
}: {
  badge: ReactNode;
  title: string;
  body: string;
  doctor: Appointment['doctor'];
  specialty: Specialty;
  when: string;
  whenIcon: LucideIcon;
  whenDetail: string;
  reason?: string;
}) {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.content, styles.doneContent]}>
      <Surface style={styles.doneCard}>
        <View style={styles.doneTop}>
          {badge}
          <ThemedText style={styles.doneTitle} accessibilityRole="header">
            {title}
          </ThemedText>
          <ThemedText style={styles.doneBody}>{body}</ThemedText>
        </View>
        <View style={styles.rule} />
        <Divided>
          {doctor ? (
            <ListRow
              leading={<DoctorAvatar name={doctor.name} photoUrl={doctor.photoUrl} size={LIST_LEAD} />}
              title={doctor.name}
              subtitle={specialtyLabel(specialty)}
            />
          ) : null}
          <ListRow
            leading={<IconTile icon={whenIcon} size={LIST_LEAD} />}
            title={when}
            subtitle={whenDetail}
          />
          {reason ? (
            <ListRow
              leading={<IconTile icon={MessageSquareText} size={LIST_LEAD} />}
              title={
                <ThemedText style={listText.subtitle} numberOfLines={3}>
                  “{reason}”
                </ThemedText>
              }
            />
          ) : null}
        </Divided>
      </Surface>

      <Button label="Done" onPress={() => router.dismissTo('/care')} />
    </ScrollView>
  );
}

function Confirmation({ appointment }: { appointment: Appointment }) {
  return (
    <Done
      badge={<DoneBadge icon={Check} good />}
      title="You’re booked"
      body="Your video consult is confirmed. You’ll find it under Your consults in Care, and on Home."
      doctor={appointment.doctor}
      specialty={appointment.specialty}
      when={formatSlot(appointment.scheduledAt)}
      whenIcon={CalendarCheck}
      whenDetail="Video consult in the app"
      reason={appointment.reason}
    />
  );
}

function RequestSent({ request }: { request: ConsultRequest }) {
  return (
    <Done
      badge={<DoneBadge icon={Send} />}
      title="Request sent"
      body={`${request.doctor?.name ?? 'The doctor'} will confirm or decline. If they confirm, it’s booked and shows under Your consults in Care. If not, you can pick one of their open slots.`}
      doctor={request.doctor}
      specialty={request.specialty}
      when={formatSlot(request.requestedAt)}
      whenIcon={Clock}
      whenDetail="Waiting for the doctor to confirm"
      reason={request.reason}
    />
  );
}

/** The page around each step: the warm backdrop, a back (or close) bar, then the content. */
function Shell({
  title,
  onBack,
  close = false,
  children,
}: {
  /** Left out on the done screens, whose card has the big title. */
  title?: string;
  onBack: () => void;
  /** Done screens close back to Care rather than stepping back. */
  close?: boolean;
  children: ReactNode;
}) {
  return (
    <View style={styles.container}>
      <PageBackground />
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StackHeader
          onBack={onBack}
          backLabel={close ? 'Care' : undefined}
          title={title}
          close={close}
        />
        {children}
      </SafeAreaView>
    </View>
  );
}

/** The doctor card, days and slots while the doctor loads. */
function BookingSkeleton() {
  return (
    <SkeletonGroup label="Loading free times" style={styles.skeletonStack}>
      <Surface style={styles.doctorTop}>
        <SkeletonCircle size={52} />
        <View style={styles.flex}>
          <Skeleton width="55%" height={16} />
          <Skeleton width="40%" height={11} style={styles.skeletonGap} />
        </View>
      </Surface>
      <Skeleton width={140} height={20} />
      <View style={styles.skeletonRow}>
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} width={DAY_WIDTH} height={80} radius={Radius.pill} />
        ))}
      </View>
      <Skeleton width={130} height={20} />
      <Skeleton height={48} radius={Radius.pill} />
      <View style={styles.slots}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} width="30%" height={44} radius={Radius.pill} />
        ))}
      </View>
    </SkeletonGroup>
  );
}

const DAY_WIDTH = 60;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.canvas,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  noTouch: {
    pointerEvents: 'none',
  },
  onInk: {
    color: Colors.onInk,
  },
  onInkSoft: {
    color: Colors.onInkMuted,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  content: {
    gap: Spacing.four - 4,
    paddingHorizontal: Gutter,
    paddingTop: Spacing.one,
  },
  skeletonGap: {
    marginTop: 8,
  },
  skeletonStack: {
    gap: Spacing.three,
  },
  skeletonRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },

  // The doctor
  doctor: {
    paddingVertical: 14,
  },
  doctorTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
  },
  doctorName: {
    fontFamily: Fonts.displaySemibold,
    fontSize: 18,
    lineHeight: 23,
    letterSpacing: -0.3,
    color: Colors.text,
  },
  doctorLine: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSoft,
  },
  mode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  modeText: {
    flexShrink: 1,
    fontFamily: Fonts.semibold,
    fontSize: 12.5,
    lineHeight: 16,
    color: Colors.textFaint,
  },
  // A hairline across the whole card.
  rule: {
    height: StyleSheet.hairlineWidth,
    marginVertical: Spacing.three - 4,
    marginHorizontal: -Spacing.three,
    backgroundColor: Colors.hairline,
  },
  about: {
    gap: 3,
  },
  aboutTitle: {
    fontFamily: Fonts.semibold,
    fontSize: 12.5,
    lineHeight: 17,
    color: Colors.textFaint,
  },
  aboutText: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSoft,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },

  // Days: tall pills that scroll sideways, out to the screen's edges.
  daysScroll: {
    marginHorizontal: -Gutter,
  },
  days: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Gutter,
    // Room for the pills' shadows.
    paddingTop: 2,
    paddingBottom: 6,
  },
  day: {
    width: DAY_WIDTH,
    alignItems: 'center',
    paddingTop: 11,
    paddingBottom: 12,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.hairline,
    backgroundColor: Colors.backgroundElement,
    boxShadow: Shadows.soft,
  },
  daySelected: {
    borderColor: Colors.text,
    backgroundColor: Colors.text,
  },
  // Nothing to book: faded, flat, still in its place so the week reads in order.
  dayClosed: {
    opacity: 0.5,
    backgroundColor: 'transparent',
    boxShadow: 'none',
  },
  dayWeekday: {
    fontFamily: Fonts.semibold,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textFaint,
  },
  dayNumber: {
    marginVertical: 1,
    fontFamily: Fonts.displaySemibold,
    fontSize: 21,
    lineHeight: 26,
    letterSpacing: -0.4,
    color: Colors.text,
    fontVariant: ['tabular-nums'],
  },
  dayStatus: {
    fontFamily: Fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    color: Colors.textFaint,
  },

  // Times
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    paddingHorizontal: 2,
  },
  noteText: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSoft,
  },
  group: {
    gap: Spacing.two,
  },
  groupTitle: {
    marginTop: 2,
    fontFamily: Fonts.semibold,
    fontSize: 13,
    lineHeight: 17,
    color: Colors.textFaint,
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
    justifyContent: 'center',
    minHeight: 44,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.hairline,
    backgroundColor: Colors.backgroundElement,
    boxShadow: Shadows.soft,
  },
  slotSelected: {
    borderColor: Colors.text,
    backgroundColor: Colors.text,
  },
  // Taken: no fill, no lift, faint words.
  slotTaken: {
    backgroundColor: 'transparent',
    boxShadow: 'none',
  },
  slotText: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    lineHeight: 18,
    color: Colors.text,
    fontVariant: ['tabular-nums'],
  },
  slotTakenText: {
    fontFamily: Fonts.semibold,
    color: Colors.textMuted,
  },
  empty: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSoft,
  },
  trust: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: Spacing.two,
  },
  trustIcon: {
    marginTop: 2,
  },
  trustText: {
    flexShrink: 1,
    fontFamily: Fonts.medium,
    fontSize: 12.5,
    lineHeight: 17,
    color: Colors.textFaint,
  },

  // The pinned button
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: Spacing.two + 2,
    paddingTop: Spacing.two,
    paddingHorizontal: Gutter,
    backgroundColor: Colors.canvas,
  },
  // Above the footer: the page fades into it instead of stopping at an edge.
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: '100%',
    height: Spacing.five,
  },
  summary: {
    textAlign: 'center',
    fontFamily: Fonts.semibold,
    fontSize: 13,
    lineHeight: 17,
    color: Colors.textSoft,
  },
  error: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 6,
  },
  errorText: {
    flexShrink: 1,
    fontFamily: Fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.high,
  },

  // Done
  doneContent: {
    paddingTop: Spacing.three,
    paddingBottom: Spacing.six + Spacing.five,
  },
  doneCard: {
    paddingTop: Spacing.four,
    paddingBottom: Spacing.one,
  },
  doneTop: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.two,
  },
  doneTitle: {
    marginTop: Spacing.two,
    textAlign: 'center',
    fontFamily: Fonts.displaySemibold,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.5,
    color: Colors.text,
  },
  doneBody: {
    textAlign: 'center',
    fontFamily: Fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSoft,
  },
  badgeShadow: {
    borderRadius: 36,
    boxShadow: Shadows.dish,
  },
  badge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.backgroundElement,
  },
  badgeGood: {
    backgroundColor: Colors.goodSoft,
  },
});
