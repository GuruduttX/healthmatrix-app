import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  CalendarCheck,
  Check,
  ChevronLeft,
  Clock,
  Lock,
  Send,
  Video,
} from 'lucide-react-native';
import { useCallback, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Surface } from '@/components/ui/surface';
import { Colors, Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { formStyles } from '@/features/card/form-styles';
import { CustomTimePicker } from '@/features/doctors/custom-time-picker';
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
/** A custom time must be at least this far ahead. Matches `REQUEST_NOTICE_MS` on the server. */
const REQUEST_NOTICE_MS = 30 * 60 * 1000;

/** Booking one of the doctor's open slots, or asking them for a time of the member's own. */
type Mode = 'slots' | 'request';

/** Today's earliest "HH:mm" a custom time can be asked for, on a 5-minute mark. */
function earliestRequestTime(now: Date) {
  const at = new Date(Math.ceil((now.getTime() + REQUEST_NOTICE_MS) / 300_000) * 300_000);
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
      <Shell title="Request sent" onBack={() => router.dismissTo('/care')}>
        <RequestSent request={requested} />
      </Shell>
    );
  }

  if (booked) {
    return (
      <Shell title="Booked" onBack={() => router.dismissTo('/care')}>
        <Confirmation appointment={booked} />
      </Shell>
    );
  }

  if (!data) {
    return (
      <Shell title="Book appointment" onBack={back}>
        <View style={styles.loading}>
          {loadError ? (
            <>
              <ThemedText type="small" themeColor="danger" style={styles.center}>
                {loadError}
              </ThemedText>
              <Button
                label="Try again"
                variant="secondary"
                onPress={() => void reload()}
              />
            </>
          ) : (
            <ActivityIndicator color={Colors.textSecondary} />
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
  // Today only from 30 minutes on; a day the window ends before is closed.
  const requestEarliest = date === soonest.date ? soonest.time : null;
  const requestDayOpen = !!date && date >= soonest.date;
  const requestAt = date && requestTime && requestDayOpen ? istInstant(date, requestTime) : null;
  const canSubmit = mode === 'slots' ? !!chosen : !!requestAt;

  const switchMode = (next: Mode) => {
    setMode(next);
    setSlotAt(null);
    setRequestTime(null);
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
            <DoctorAvatar name={doctor.name} photoUrl={doctor.photoUrl} size={52} />
            <View style={styles.flex}>
              <ThemedText type="bodyBold" numberOfLines={1}>
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
              <ThemedText type="bodyBold">About {doctor.name}</ThemedText>
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

          <Section title="Choose a day">
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
                      setRequestTime(null);
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
            hint="India time (IST)">
            <View style={styles.modes}>
              <Chip
                label="Open slots"
                selected={mode === 'slots'}
                onPress={() => switchMode('slots')}
              />
              <Chip
                label="Custom time"
                selected={mode === 'request'}
                onPress={() => switchMode('request')}
              />
            </View>
            {mode === 'request' ? (
              <>
                <View style={styles.requestNote}>
                  <Clock size={15} color={Colors.primary} strokeWidth={2.2} />
                  <ThemedText type="caption" themeColor="textSecondary" style={styles.flex}>
                    Ask {doctor.name} for any time, like 3:25 PM. Nothing is booked until they
                    confirm; you’ll see their answer under Your consults in Care.
                  </ThemedText>
                </View>
                {requestDayOpen ? (
                  <CustomTimePicker
                    value={requestTime}
                    onChange={(time) => {
                      setRequestTime(time);
                      setError(null);
                    }}
                    earliest={requestEarliest}
                  />
                ) : null}
                {!requestDayOpen || (requestEarliest && requestEarliest > '22:55') ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    It’s too late to ask for today. Pick another day.
                  </ThemedText>
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
            hint="Optional. Helps the doctor prepare.">
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="e.g. Chest pain on climbing stairs for a week"
              placeholderTextColor={Colors.textMuted}
              maxLength={300}
              multiline
              editable={!busy}
              style={[formStyles.input, styles.reason]}
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
      <View style={styles.doneIcon}>
        <Check size={40} color={Colors.onInk} strokeWidth={3} />
      </View>
      <ThemedText type="title" style={styles.center}>
        You’re booked
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
        Your video consult is confirmed. You’ll find it under Upcoming appointments in Care.
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
      <View style={[styles.doneIcon, styles.requestIcon]}>
        <Send size={34} color={Colors.onInk} strokeWidth={2.4} />
      </View>
      <ThemedText type="title" style={styles.center}>
        Request sent
      </ThemedText>
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

function Shell({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.topBar}>
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={8}
            style={({ pressed }) => [styles.round, pressed && styles.pressed]}>
            <ChevronLeft size={20} color={Colors.text} strokeWidth={2.2} />
          </Pressable>
          <ThemedText type="subtitle">{title}</ThemedText>
        </View>
        {children}
      </SafeAreaView>
    </ThemedView>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <Surface style={styles.section}>
      <View style={styles.sectionHeader}>
        <ThemedText type="bodyBold">{title}</ThemedText>
        {hint ? (
          <ThemedText type="caption" themeColor="textSecondary">
            {hint}
          </ThemedText>
        ) : null}
      </View>
      {children}
    </Surface>
  );
}

const styles = StyleSheet.create({
  modes: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  requestNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  sendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  requestIcon: {
    backgroundColor: Colors.primary,
  },
  container: {
    flex: 1,
    alignItems: 'center',
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 4,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  round: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pressed: {
    opacity: 0.75,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
  },
  content: {
    gap: Spacing.three,
    padding: Spacing.three,
    paddingTop: Spacing.one,
  },
  doctor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 4,
  },
  mode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  modeText: {
    fontFamily: Fonts.semibold,
  },
  section: {
    gap: Spacing.two + 4,
    padding: Spacing.three,
  },
  sectionHeader: {
    gap: 2,
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
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  day: {
    width: 68,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
  },
  daySelected: {
    borderColor: Colors.ink,
    backgroundColor: Colors.ink,
  },
  dayFull: {
    opacity: 0.5,
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
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
  },
  slotSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  slotTaken: {
    backgroundColor: Colors.background,
  },
  struck: {
    textDecorationLine: 'line-through',
  },
  reason: {
    minHeight: 88,
    textAlignVertical: 'top',
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
    minHeight: 58,
    paddingVertical: 8,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
  },
  bookDisabled: {
    opacity: 0.45,
  },
  bookSub: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  done: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
    paddingTop: Spacing.five,
  },
  doneIcon: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.success,
  },
  doneCard: {
    alignSelf: 'stretch',
    gap: Spacing.two + 4,
    padding: Spacing.three,
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
