import { router, useLocalSearchParams } from 'expo-router';
import { CalendarCheck, Check, ChevronLeft, Lock, Video } from 'lucide-react-native';
import { useEffect, useState, type ReactNode } from 'react';
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
import { DoctorAvatar } from '@/features/doctors/doctor-avatar';
import { specialtyLabel } from '@/features/doctors/specialties';
import { formatSlot, istToday } from '@/features/doctors/time';
import {
  type Appointment,
  type DoctorWithSlots,
  type Slot,
  type Specialty,
} from '@/features/doctors/types';
import { useAppointments } from '@/features/doctors/use-appointments';
import {
  formatDay,
  formatTime,
  fromDateKey,
  partOfDay,
  WEEKDAY_NAMES,
} from '@/features/reminders/schedule';
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

/** Book a video consult with one doctor: pick a day, a time, and say what it's about. */
export default function BookDoctorScreen() {
  const { doctorId, specialty: wanted } = useLocalSearchParams<{
    doctorId: string;
    specialty?: string;
  }>();
  const { book } = useAppointments();
  const clearance = useTabBarClearance();

  const [data, setData] = useState<DoctorWithSlots | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloads, setReloads] = useState(0);

  const [specialty, setSpecialty] = useState<Specialty | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [slotAt, setSlotAt] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booked, setBooked] = useState<Appointment | null>(null);

  useEffect(() => {
    let active = true;
    api<DoctorWithSlots>(`/doctors/${doctorId}`)
      .then((next) => {
        if (!active) return;
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
        setSpecialty((current) => {
          if (current) return current;
          const fromList = next.doctor.specialties.find((id) => id === wanted);
          return fromList ?? next.doctor.specialties[0] ?? null;
        });
      })
      .catch((e: unknown) => {
        if (active) setLoadError(e instanceof Error ? e.message : 'Could not load this doctor');
      });
    return () => {
      active = false;
    };
  }, [doctorId, wanted, reloads]);

  const back = () => (router.canGoBack() ? router.back() : router.dismissTo('/care'));

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
                onPress={() => setReloads((n) => n + 1)}
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
  const today = istToday();
  const day = days.find((d) => d.date === date);
  const chosen = day?.slots.find((slot) => slot.at === slotAt && slot.available);

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
        setReloads((n) => n + 1);
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

          {doctor.specialties.length > 1 ? (
            <Section title="Consult for">
              <View style={styles.wrap}>
                {doctor.specialties.map((id) => (
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
                      setError(null);
                    }}
                    disabled={!free}
                    accessibilityRole="button"
                    accessibilityState={{ selected, disabled: !free }}
                    accessibilityLabel={`${formatDay(d.date, today)}, ${free ? `${free} free slots` : 'fully booked'}`}
                    style={({ pressed }) => [
                      styles.day,
                      selected && styles.daySelected,
                      !free && styles.dayFull,
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
                      {free ? `${free} free` : 'Full'}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Section>

          <Section title="Choose a time" hint="India time (IST)">
            {day && day.slots.length ? (
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
                No slots left on this day. Pick another day.
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
            onPress={confirm}
            disabled={!chosen || busy}
            accessibilityRole="button"
            accessibilityState={{ disabled: !chosen || busy, busy }}
            style={({ pressed }) => [
              styles.book,
              !chosen && styles.bookDisabled,
              pressed && styles.pressed,
            ]}>
            {busy ? (
              <ActivityIndicator color={Colors.onInk} />
            ) : (
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
