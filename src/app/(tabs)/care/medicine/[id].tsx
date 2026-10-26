import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { type NativeStackNavigationProp } from 'expo-router/native-stack';
import {
  AlertCircle,
  BellRing,
  ChevronDown,
  Clock,
  Minus,
  Plus,
  SearchX,
  Trash2,
  X,
} from 'lucide-react-native';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  type TextInputInstance,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { Glass, glassSurface } from '@/components/ui/glass';
import { PageBackground } from '@/components/ui/morning-light';
import { Section } from '@/components/ui/section';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { StackHeader } from '@/components/ui/stack-header';
import { TextField } from '@/components/ui/text-field';
import {
  Colors,
  Fonts,
  Glass as GlassTokens,
  Gutter,
  MaxContentWidth,
  Radius,
  Spacing,
} from '@/constants/theme';
import { DatePicker } from '@/features/reminders/date-picker';
import { getPermission, requestPermission } from '@/features/reminders/notifications';
import {
  addDays,
  daysBetween,
  describeRepeat,
  formatDay,
  formatShortDate,
  formatTime,
  fromDateKey,
  toDateKey,
  WEEKDAY_LETTERS,
  WEEKDAY_NAMES,
} from '@/features/reminders/schedule';
import { TimePicker } from '@/features/reminders/time-picker';
import {
  MEAL_TIMING_LABELS,
  type DateKey,
  type Frequency,
  type MealTiming,
  type MedicineReminder,
  type ReminderDraft,
  type TimeKey,
} from '@/features/reminders/types';
import { useReminders } from '@/features/reminders/use-reminders';
import { useTabBarClearance } from '@/hooks/use-tab-bar-clearance';

const FREQUENCIES: { id: Frequency; label: string }[] = [
  { id: 'daily', label: 'Every day' },
  { id: 'weekdays', label: 'Some days' },
  { id: 'interval', label: 'Every few days' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'once', label: 'Just once' },
];

const MEAL_OPTIONS: { id: MealTiming | null; label: string }[] = [
  { id: null, label: 'Any time' },
  ...(Object.entries(MEAL_TIMING_LABELS) as [MealTiming, string][]).map(([id, label]) => ({
    id,
    label,
  })),
];

const DOSE_SUGGESTIONS = ['1 tablet', '2 tablets', '1 capsule', '½ tablet', '5 ml', '10 ml'];

const TIME_PRESETS: { label: string; time: TimeKey }[] = [
  { label: 'Morning', time: '08:00' },
  { label: 'Afternoon', time: '14:00' },
  { label: 'Evening', time: '20:00' },
  { label: 'Bedtime', time: '22:00' },
];

/** Course lengths offered as one tap, in days. */
const DURATIONS = [5, 7, 10, 14, 30];

/** The Save button and the fade above it, which the end of the form scrolls clear of. */
const FOOTER_HEIGHT = 48 + Spacing.four + Spacing.two;

type Form = {
  name: string;
  dose: string;
  mealTiming: MealTiming | null;
  note: string;
  times: TimeKey[];
  frequency: Frequency;
  weekdays: number[];
  everyDays: number;
  startsOn: DateKey;
  endsOn: DateKey | null;
};

function emptyForm(today: DateKey, name = ''): Form {
  return {
    name,
    dose: '',
    mealTiming: null,
    note: '',
    times: ['08:00'],
    frequency: 'daily',
    weekdays: [fromDateKey(today).getDay()],
    everyDays: 2,
    startsOn: today,
    endsOn: null,
  };
}

function toForm(reminder: MedicineReminder, today: DateKey): Form {
  return {
    name: reminder.name,
    dose: reminder.dose ?? '',
    mealTiming: reminder.mealTiming ?? null,
    note: reminder.note ?? '',
    times: reminder.times,
    frequency: reminder.frequency,
    weekdays: reminder.weekdays ?? [fromDateKey(today).getDay()],
    everyDays: reminder.everyDays ?? 2,
    startsOn: reminder.startsOn,
    endsOn: reminder.endsOn ?? null,
  };
}

function toDraft(form: Form): ReminderDraft {
  return {
    name: form.name.trim(),
    dose: form.dose.trim() || null,
    mealTiming: form.mealTiming,
    note: form.note.trim() || null,
    times: form.times,
    frequency: form.frequency,
    weekdays: form.frequency === 'weekdays' ? form.weekdays : null,
    everyDays: form.frequency === 'interval' ? form.everyDays : null,
    startsOn: form.startsOn,
    endsOn: form.frequency === 'once' ? null : form.endsOn,
  };
}

const NAME_MISSING = 'Enter the medicine name.';

/** The first thing to fix before saving, if any. */
function problem(form: Form) {
  if (!form.name.trim()) return NAME_MISSING;
  if (!form.times.length) return 'Add at least one time.';
  if (form.frequency === 'weekdays' && !form.weekdays.length) return 'Pick at least one day.';
  return null;
}

/** "and"-joined list: "8:00 AM, 2:00 PM and 8:00 PM". */
function joinWords(words: string[]) {
  return words.length < 2
    ? (words[0] ?? '')
    : `${words.slice(0, -1).join(', ')} and ${words.at(-1)}`;
}

/** The plan in one sentence, shown at the end of the form. */
function summarize(form: Form, today: DateKey) {
  const times = joinWords(form.times.map(formatTime));
  if (form.frequency === 'once') {
    const day = formatDay(form.startsOn, today);
    const when = /^(Today|Tomorrow|Yesterday)$/.test(day) ? day.toLowerCase() : `on ${day}`;
    return `One reminder at ${times} ${when}.`;
  }
  const repeat = describeRepeat(form).toLowerCase();
  const start =
    form.startsOn === today ? 'starting today' : `from ${formatShortDate(form.startsOn)}`;
  const end = form.endsOn
    ? `for ${daysBetween(form.startsOn, form.endsOn) + 1} days, until ${formatShortDate(form.endsOn)}`
    : 'with no end date';
  return `Reminders at ${times}, ${repeat}, ${start}, ${end}.`;
}

function confirm(title: string, message: string, action: string) {
  if (Platform.OS === 'web')
    return Promise.resolve(globalThis.confirm?.(`${title}\n\n${message}`) ?? false);
  return new Promise<boolean>((resolve) =>
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: action, style: 'destructive', onPress: () => resolve(true) },
    ]),
  );
}

/** Add a medicine (`/care/medicine/new`) or edit one (`/care/medicine/<id>`). */
export default function MedicineFormScreen() {
  // `name` prefills a new medicine, e.g. from a line on a prescription.
  const { id, name: prefill } = useLocalSearchParams<{ id: string; name?: string }>();
  const isNew = id === 'new';
  const { reminders, error: loadError, refresh, create, update, remove } = useReminders();
  const clearance = useTabBarClearance();
  // Fixed for the life of the form, so its defaults do not shift at midnight.
  const [today] = useState(() => toDateKey(new Date()));
  const navigation = useNavigation<NativeStackNavigationProp<Record<string, object | undefined>>>();
  const nameInput = useRef<TextInputInstance>(null);

  // A new medicine starts on its name, but only once the screen has slid in: the keyboard
  // opening during the slide makes it stutter. Web may not report the end, so a timer backs it up.
  useEffect(() => {
    if (!isNew) return;
    let focused = false;
    const focusName = () => {
      if (focused) return;
      focused = true;
      nameInput.current?.focus();
    };
    const unsubscribe = navigation.addListener('transitionEnd', (event) => {
      if (!event.data.closing) focusName();
    });
    const fallback = setTimeout(focusName, 600);
    return () => {
      unsubscribe();
      clearTimeout(fallback);
    };
  }, [isNew, navigation]);

  const existing = isNew ? undefined : reminders?.find((reminder) => reminder.id === id);
  const [form, setForm] = useState<Form | null>(() =>
    isNew ? emptyForm(today, prefill?.slice(0, 60)) : null,
  );
  // Fill the form once the reminder is loaded.
  if (!form && existing) setForm(toForm(existing, today));

  const [timeEditor, setTimeEditor] = useState<{ index: number | null; value: TimeKey } | null>(
    null,
  );
  const [calendar, setCalendar] = useState<'start' | 'end' | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/care/medicines'));

  const edit = (patch: Partial<Form>) => {
    setForm((current) => (current ? { ...current, ...patch } : current));
    setError(null);
  };

  if (!form) {
    return (
      <Shell title="Edit medicine" onBack={close}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: clearance + Spacing.four }]}>
          {reminders && !existing ? (
            <EmptyState
              icon={SearchX}
              tone="neutral"
              title="This medicine no longer exists"
              body="It may have been deleted on another device."
              action={{ label: 'Back to medicines', onPress: close }}
            />
          ) : loadError ? (
            <ErrorState title="Couldn’t load this medicine" message={loadError} onRetry={refresh} />
          ) : (
            <FormSkeleton />
          )}
        </ScrollView>
      </Shell>
    );
  }

  const saveTime = () => {
    if (!timeEditor) return;
    const others = form.times.filter((_, i) => i !== timeEditor.index);
    edit({ times: [...new Set([...others, timeEditor.value])].sort() });
    setTimeEditor(null);
  };

  const setStart = (startsOn: DateKey) => {
    // Keep the course the same length when its first day moves.
    const endsOn = form.endsOn ? addDays(form.endsOn, daysBetween(form.startsOn, startsOn)) : null;
    edit({ startsOn, endsOn });
    setCalendar(null);
  };

  const courseDays = form.endsOn ? daysBetween(form.startsOn, form.endsOn) + 1 : null;
  const customEnd = courseDays !== null && !DURATIONS.includes(courseDays);

  const save = async () => {
    const issue = problem(form);
    if (issue) {
      setError(issue);
      // Save stays at the bottom while the name is at the top: take the member to it.
      if (issue === NAME_MISSING) nameInput.current?.focus();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const draft = toDraft(form);
      if (isNew) await create(draft);
      else await update(id, draft);
      // Ask for notifications the first time a reminder is saved, when it makes sense.
      if ((await getPermission()) === 'undetermined') await requestPermission();
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save this medicine. Try again.');
      setBusy(false);
    }
  };

  const deleteMedicine = async () => {
    const ok = await confirm(
      `Delete ${form.name || 'this medicine'}?`,
      'Its reminders stop and its dose history is removed.',
      'Delete',
    );
    if (!ok) return;
    setBusy(true);
    try {
      await remove(id);
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete this medicine. Try again.');
      setBusy(false);
    }
  };

  return (
    <Shell title={isNew ? 'Add medicine' : 'Edit medicine'} onBack={close}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.content,
            { paddingBottom: clearance + FOOTER_HEIGHT + Spacing.three },
          ]}>
          <Section title="Medicine" index={0}>
            <Card>
              <TextField
                ref={nameInput}
                label="Name"
                value={form.name}
                onChangeText={(name) => edit({ name })}
                placeholder="e.g. Metformin"
                autoCapitalize="words"
                maxLength={60}
                editable={!busy}
                error={error === NAME_MISSING ? error : null}
              />
              <View style={styles.field}>
                <TextField
                  label="Dose (optional)"
                  value={form.dose}
                  onChangeText={(dose) => edit({ dose })}
                  placeholder="e.g. 500 mg"
                  maxLength={40}
                  editable={!busy}
                />
                <View style={styles.wrapRow}>
                  {DOSE_SUGGESTIONS.map((dose) => (
                    <SmallChip
                      key={dose}
                      label={dose}
                      selected={form.dose === dose}
                      onPress={() => edit({ dose: form.dose === dose ? '' : dose })}
                    />
                  ))}
                </View>
              </View>

              <Rule />

              <Group title="With food?">
                <View style={styles.wrapRow}>
                  {MEAL_OPTIONS.map((option) => (
                    <Chip
                      key={option.label}
                      label={option.label}
                      selected={form.mealTiming === option.id}
                      onPress={() => edit({ mealTiming: option.id })}
                    />
                  ))}
                </View>
              </Group>
            </Card>
          </Section>

          <Section title="Reminders" index={1}>
            <Card>
              <Group title="Times" hint="You get a reminder at each time.">
                <View style={styles.wrapRow}>
                  {form.times.map((time, index) => {
                    const active = timeEditor?.index === index;
                    return (
                      <View
                        key={time}
                        style={[
                          glassSurface.small,
                          styles.timePill,
                          active && styles.timePillActive,
                        ]}>
                        <Pressable
                          onPress={() => setTimeEditor({ index, value: time })}
                          accessibilityRole="button"
                          accessibilityLabel={`Change ${formatTime(time)}`}
                          style={({ pressed }) => [styles.timePillMain, pressed && styles.pressed]}>
                          <Clock
                            size={15}
                            color={active ? Colors.onInk : Colors.textSoft}
                            strokeWidth={2.3}
                          />
                          <ThemedText style={[styles.timeText, active && styles.onInk]}>
                            {formatTime(time)}
                          </ThemedText>
                        </Pressable>
                        {form.times.length > 1 ? (
                          <Pressable
                            onPress={() => {
                              edit({ times: form.times.filter((other) => other !== time) });
                              setTimeEditor(null);
                            }}
                            accessibilityRole="button"
                            accessibilityLabel={`Remove ${formatTime(time)}`}
                            hitSlop={8}
                            style={({ pressed }) => [styles.timeRemove, pressed && styles.pressed]}>
                            <X
                              size={14}
                              color={active ? Colors.onInkMuted : Colors.textMuted}
                              strokeWidth={2.4}
                            />
                          </Pressable>
                        ) : null}
                      </View>
                    );
                  })}
                  {!timeEditor && form.times.length < 8 ? (
                    <Pressable
                      onPress={() =>
                        setTimeEditor({ index: null, value: suggestNextTime(form.times) })
                      }
                      accessibilityRole="button"
                      style={({ pressed }) => [
                        glassSurface.small,
                        styles.addTime,
                        pressed && styles.addTimePressed,
                      ]}>
                      <Plus size={15} color={Colors.primaryDeep} strokeWidth={2.6} />
                      <ThemedText style={styles.addTimeText}>Add a time</ThemedText>
                    </Pressable>
                  ) : null}
                </View>

                {timeEditor ? (
                  <View style={styles.editor}>
                    <TimePicker
                      value={timeEditor.value}
                      onChange={(value) => setTimeEditor({ ...timeEditor, value })}
                    />
                    <View style={styles.editorActions}>
                      <View style={styles.flex}>
                        <Button
                          label="Cancel"
                          variant="secondary"
                          size="sm"
                          onPress={() => setTimeEditor(null)}
                        />
                      </View>
                      <View style={styles.editorPrimary}>
                        <Button
                          label={timeEditor.index === null ? 'Add time' : 'Update time'}
                          size="sm"
                          shadow={false}
                          onPress={saveTime}
                        />
                      </View>
                    </View>
                  </View>
                ) : form.times.length < 8 ? (
                  <View style={styles.wrapRow}>
                    {TIME_PRESETS.filter((preset) => !form.times.includes(preset.time)).map(
                      (preset) => (
                        <SmallChip
                          key={preset.time}
                          label={`${preset.label} ${formatTime(preset.time)}`}
                          icon
                          onPress={() => edit({ times: [...form.times, preset.time].sort() })}
                        />
                      ),
                    )}
                  </View>
                ) : null}
              </Group>

              <Rule />

              <Group title="How often">
                <View style={styles.wrapRow}>
                  {FREQUENCIES.map((option) => (
                    <Chip
                      key={option.id}
                      label={option.label}
                      selected={form.frequency === option.id}
                      onPress={() => edit({ frequency: option.id })}
                    />
                  ))}
                </View>

                {form.frequency === 'weekdays' ? (
                  <>
                    <View style={styles.weekdays}>
                      {WEEKDAY_LETTERS.map((letter, day) => {
                        const on = form.weekdays.includes(day);
                        return (
                          <Pressable
                            key={day}
                            onPress={() =>
                              edit({
                                weekdays: on
                                  ? form.weekdays.filter((other) => other !== day)
                                  : [...form.weekdays, day].sort(),
                              })
                            }
                            accessibilityRole="checkbox"
                            accessibilityState={{ checked: on }}
                            accessibilityLabel={WEEKDAY_NAMES[day]}
                            style={({ pressed }) => [
                              glassSurface.flat,
                              styles.weekday,
                              on && styles.weekdayOn,
                              pressed && styles.pressed,
                            ]}>
                            <ThemedText style={[styles.weekdayText, on && styles.onInk]}>
                              {letter}
                            </ThemedText>
                          </Pressable>
                        );
                      })}
                    </View>
                    <View style={styles.wrapRow}>
                      <SmallChip
                        label="Weekdays"
                        onPress={() => edit({ weekdays: [1, 2, 3, 4, 5] })}
                      />
                      <SmallChip label="Weekends" onPress={() => edit({ weekdays: [0, 6] })} />
                      <SmallChip
                        label="Mon, Wed, Fri"
                        onPress={() => edit({ weekdays: [1, 3, 5] })}
                      />
                    </View>
                  </>
                ) : null}

                {form.frequency === 'interval' ? (
                  <View style={styles.stepper}>
                    <StepButton
                      label="Fewer days"
                      icon={Minus}
                      disabled={form.everyDays <= 2}
                      onPress={() => edit({ everyDays: form.everyDays - 1 })}
                    />
                    <ThemedText style={styles.stepperText}>
                      Every {form.everyDays} days
                    </ThemedText>
                    <StepButton
                      label="More days"
                      icon={Plus}
                      disabled={form.everyDays >= 90}
                      onPress={() => edit({ everyDays: form.everyDays + 1 })}
                    />
                  </View>
                ) : null}

                {form.frequency === 'monthly' || form.frequency === 'once' ? (
                  <ThemedText style={styles.hint}>
                    {form.frequency === 'monthly'
                      ? `${describeRepeat(form)}, counted from the start date.`
                      : 'One reminder on the day below.'}
                  </ThemedText>
                ) : null}
              </Group>
            </Card>
          </Section>

          <Section title={form.frequency === 'once' ? 'Date' : 'Dates'} index={2}>
            <Card>
              <DateRow
                label={form.frequency === 'once' ? 'On' : 'Starts'}
                value={formatDay(form.startsOn, today)}
                open={calendar === 'start'}
                onPress={() => setCalendar(calendar === 'start' ? null : 'start')}
              />
              {calendar === 'start' ? (
                <DatePicker value={form.startsOn} onChange={setStart} today={today} />
              ) : null}

              {form.frequency !== 'once' ? (
                <>
                  <Rule />
                  <Group title="For how long">
                    <View style={styles.wrapRow}>
                      <Chip
                        label="Ongoing"
                        selected={!form.endsOn}
                        onPress={() => {
                          edit({ endsOn: null });
                          setCalendar(null);
                        }}
                      />
                      {DURATIONS.map((days) => (
                        <Chip
                          key={days}
                          label={`${days} days`}
                          selected={courseDays === days}
                          onPress={() => {
                            edit({ endsOn: addDays(form.startsOn, days - 1) });
                            setCalendar(null);
                          }}
                        />
                      ))}
                      <Chip
                        label="Pick end date"
                        selected={customEnd}
                        onPress={() => {
                          if (!form.endsOn) edit({ endsOn: addDays(form.startsOn, 6) });
                          setCalendar('end');
                        }}
                      />
                    </View>
                  </Group>
                  {form.endsOn ? (
                    <>
                      <Rule />
                      <DateRow
                        label="Last day"
                        value={formatDay(form.endsOn, today)}
                        open={calendar === 'end'}
                        onPress={() => setCalendar(calendar === 'end' ? null : 'end')}
                      />
                    </>
                  ) : null}
                  {calendar === 'end' && form.endsOn ? (
                    <DatePicker
                      value={form.endsOn}
                      minDate={form.startsOn}
                      onChange={(endsOn) => {
                        edit({ endsOn });
                        setCalendar(null);
                      }}
                      today={today}
                    />
                  ) : null}
                </>
              ) : null}
            </Card>
          </Section>

          <Section title="Note" caption="Optional. Shown with the reminder." index={3}>
            <TextField
              value={form.note}
              onChangeText={(note) => edit({ note })}
              placeholder="e.g. Take with a full glass of water"
              accessibilityLabel="Note"
              maxLength={120}
              multiline
              editable={!busy}
            />
          </Section>

          {/* The plan in words, so the member can check it before saving. */}
          <View style={styles.summary}>
            <BellRing size={16} color={Colors.primaryDeep} strokeWidth={2.3} />
            <ThemedText style={styles.summaryText}>{summarize(form, today)}</ThemedText>
          </View>

          {!isNew ? (
            <Button
              label="Delete medicine"
              variant="danger"
              icon={Trash2}
              disabled={busy}
              onPress={deleteMedicine}
            />
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Save stays in reach above the tab bar, on a fade of the page rather than a hard bar. */}
      <View style={[styles.footer, { paddingBottom: clearance + Spacing.two }]}>
        <LinearGradient
          colors={['rgba(251, 250, 248, 0)', Colors.canvas]}
          locations={[0, 0.4]}
          style={[StyleSheet.absoluteFill, styles.noTouch]}
        />
        {error ? (
          <View style={styles.error} accessibilityLiveRegion="polite">
            <AlertCircle size={15} color={Colors.high} strokeWidth={2.4} />
            <ThemedText style={styles.errorText}>{error}</ThemedText>
          </View>
        ) : null}
        <Button
          label={isNew ? 'Save medicine' : 'Save changes'}
          icon={BellRing}
          loading={busy}
          onPress={save}
        />
      </View>
    </Shell>
  );
}

/** An hour after the last time, or 8 AM for the first. */
function suggestNextTime(times: TimeKey[]): TimeKey {
  const last = times.at(-1);
  if (!last) return '08:00';
  const hour = Math.min(Number(last.slice(0, 2)) + 4, 23);
  return `${String(hour).padStart(2, '0')}:${last.slice(3)}`;
}

/** The page around the form: the glass design's page and its soft light, then a back bar. */
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
    <View style={styles.screen}>
      <PageBackground />
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StackHeader onBack={onBack} backLabel="Medicines" title={title} />
        {children}
      </SafeAreaView>
    </View>
  );
}

/** A pane of glass holding a few fields, a hairline between each group. */
function Card({ children }: { children: ReactNode }) {
  return <Glass style={styles.card}>{children}</Glass>;
}

/** Edge to edge across the card, between its groups of fields. */
function Rule() {
  return <View style={styles.rule} />;
}

/** One question inside a card: its name, a quiet hint, then the choices. */
function Group({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <View>
        <ThemedText style={styles.groupTitle} accessibilityRole="header">
          {title}
        </ThemedText>
        {hint ? <ThemedText style={styles.hint}>{hint}</ThemedText> : null}
      </View>
      {children}
    </View>
  );
}

/** The form's shape while the medicine loads. */
function FormSkeleton() {
  return (
    <SkeletonGroup label="Loading this medicine" style={styles.skeletonStack}>
      {[0, 1].map((i) => (
        <View key={i} style={styles.skeletonSection}>
          <Skeleton width={110} height={18} />
          <Card>
            <Skeleton width={60} height={12} />
            <Skeleton height={52} radius={Radius.lg} />
            <Skeleton width={90} height={12} />
            <Skeleton height={52} radius={Radius.lg} />
          </Card>
        </View>
      ))}
    </SkeletonGroup>
  );
}

/** A small suggestion: a pill of glass set into the card, solid ink once chosen. */
function SmallChip({
  label,
  selected,
  icon,
  onPress,
}: {
  label: string;
  selected?: boolean;
  icon?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        glassSurface.flat,
        styles.smallChip,
        selected && styles.smallChipOn,
        pressed && styles.pressed,
      ]}>
      {icon ? <Plus size={12} color={Colors.textFaint} strokeWidth={2.6} /> : null}
      <ThemedText style={[styles.smallChipText, selected && styles.onInk]}>{label}</ThemedText>
    </Pressable>
  );
}

function StepButton({
  label,
  icon: Icon,
  disabled,
  onPress,
}: {
  label: string;
  icon: typeof Plus;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        glassSurface.small,
        styles.stepButton,
        disabled && styles.disabled,
        pressed && styles.stepButtonPressed,
      ]}>
      <Icon size={18} color={Colors.text} strokeWidth={2.4} />
    </Pressable>
  );
}

/** A date as a line of the card: what it is, the day, and an arrow that opens the calendar. */
function DateRow({
  label,
  value,
  open,
  onPress,
}: {
  label: string;
  value: string;
  open: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel={`${label}: ${value}`}
      style={({ pressed }) => [styles.dateRow, pressed && styles.pressed]}>
      <ThemedText style={[styles.groupTitle, styles.flex]}>{label}</ThemedText>
      <ThemedText style={[styles.dateValue, open && styles.dateValueOpen]}>{value}</ThemedText>
      <View style={open && styles.flipped}>
        <ChevronDown size={18} color={Colors.textMuted} strokeWidth={2.4} />
      </View>
    </Pressable>
  );
}

/** Light on the top edge of a solid ink choice, as on a chosen `Chip`. */
const INK_SHINE = 'inset 0 1px 1px rgba(255, 255, 255, 0.18)';

const styles = StyleSheet.create({
  screen: {
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
  noTouch: {
    pointerEvents: 'none',
  },
  pressed: {
    opacity: 0.7,
  },
  onInk: {
    color: Colors.onInk,
  },
  content: {
    gap: Spacing.four - 4,
    paddingHorizontal: Gutter,
    paddingTop: Spacing.one,
  },
  card: {
    gap: Spacing.three - 2,
    padding: Spacing.three,
  },
  rule: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: -Spacing.three,
    backgroundColor: GlassTokens.hairline,
  },
  field: {
    gap: Spacing.two + 2,
  },
  groupTitle: {
    fontFamily: Fonts.bold,
    fontSize: 14.5,
    lineHeight: 19,
    color: Colors.text,
  },
  hint: {
    fontFamily: Fonts.medium,
    fontSize: 12.5,
    lineHeight: 17,
    color: Colors.textFaint,
  },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  smallChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: Radius.pill,
  },
  // Solid ink, with only light on its top edge: the glass's frost would haze it.
  smallChipOn: {
    borderColor: Colors.text,
    backgroundColor: Colors.text,
    boxShadow: INK_SHINE,
  },
  smallChipText: {
    fontFamily: Fonts.semibold,
    fontSize: 12.5,
    lineHeight: 16,
    color: Colors.textSoft,
  },
  // A set time: a pill of glass like a chip, solid ink while it is being changed.
  timePill: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 38,
    borderRadius: Radius.pill,
  },
  timePillActive: {
    borderColor: Colors.text,
    backgroundColor: Colors.text,
    boxShadow: `${INK_SHINE}, 0 4px 12px rgba(14, 42, 51, 0.18)`,
  },
  timePillMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingLeft: 13,
    paddingRight: 13,
  },
  timeText: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    lineHeight: 18,
    color: Colors.text,
    fontVariant: ['tabular-nums'],
  },
  timeRemove: {
    marginLeft: -5,
    paddingVertical: 8,
    paddingRight: 12,
  },
  // Glass with orange words, like Home's add button.
  addTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 38,
    paddingVertical: 8,
    paddingLeft: 12,
    paddingRight: 15,
    borderRadius: Radius.pill,
  },
  addTimePressed: {
    backgroundColor: Colors.primaryTint,
    transform: [{ scale: 0.97 }],
  },
  addTimeText: {
    fontFamily: Fonts.bold,
    fontSize: 13.5,
    lineHeight: 18,
    color: Colors.primaryDeep,
  },
  // The picker opens in the card itself, under a hairline: no box inside the box.
  editor: {
    gap: Spacing.three - 4,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: GlassTokens.hairline,
  },
  editorActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  editorPrimary: {
    flex: 1.4,
  },
  weekdays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  weekday: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayOn: {
    borderColor: Colors.text,
    backgroundColor: Colors.text,
    boxShadow: INK_SHINE,
  },
  weekdayText: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    lineHeight: 18,
    color: Colors.textSoft,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 4,
  },
  stepperText: {
    flex: 1,
    textAlign: 'center',
    fontFamily: Fonts.displaySemibold,
    fontSize: 18,
    lineHeight: 23,
    letterSpacing: -0.2,
    color: Colors.text,
    fontVariant: ['tabular-nums'],
  },
  stepButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepButtonPressed: {
    backgroundColor: Colors.well,
    transform: [{ scale: 0.96 }],
  },
  // No lift while it can't be pressed; the glass keeps its glow.
  disabled: {
    opacity: 0.35,
    boxShadow: GlassTokens.glowSmall,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 28,
  },
  dateValue: {
    fontFamily: Fonts.semibold,
    fontSize: 14.5,
    lineHeight: 19,
    color: Colors.text,
  },
  dateValueOpen: {
    color: Colors.primaryDeep,
  },
  flipped: {
    transform: [{ rotate: '180deg' }],
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two + 2,
    paddingHorizontal: Spacing.one,
  },
  summaryText: {
    flex: 1,
    fontFamily: Fonts.medium,
    fontSize: 13.5,
    lineHeight: 19,
    color: Colors.textSoft,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: Spacing.two,
    paddingTop: Spacing.four,
    paddingHorizontal: Gutter,
  },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  errorText: {
    flex: 1,
    fontFamily: Fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.high,
  },
  skeletonStack: {
    gap: Spacing.four - 4,
  },
  skeletonSection: {
    gap: Spacing.three - 2,
  },
});
