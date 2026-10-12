import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { type NativeStackNavigationProp } from 'expo-router/native-stack';
import {
  BellRing,
  CalendarDays,
  Clock,
  Minus,
  NotebookPen,
  Pill,
  Plus,
  Repeat,
  SearchX,
  Trash2,
  UtensilsCrossed,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { IconTile, type Tone } from '@/components/ui/icon-tile';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { StackHeader } from '@/components/ui/stack-header';
import { Surface } from '@/components/ui/surface';
import { TextField } from '@/components/ui/text-field';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { formStyles } from '@/features/card/form-styles';
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

/** The plan in one sentence, shown above Save. */
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
  const nameInput = useRef<TextInput>(null);

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
        <View style={styles.content}>
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
        </View>
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
          contentContainerStyle={[styles.content, { paddingBottom: clearance + Spacing.three }]}>
          <Section title="Medicine" icon={Pill} tone="primary">
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
          </Section>

          <Section title="With food?" icon={UtensilsCrossed} tone="warning">
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
          </Section>

          <Section title="Times" hint="You get a reminder at each time." icon={Clock} tone="success">
            <View style={styles.wrapRow}>
              {form.times.map((time, index) => (
                <View
                  key={time}
                  style={[styles.timePill, timeEditor?.index === index && styles.timePillActive]}>
                  <Pressable
                    onPress={() => setTimeEditor({ index, value: time })}
                    accessibilityRole="button"
                    accessibilityLabel={`Change ${formatTime(time)}`}
                    style={styles.timePillMain}>
                    <Clock size={15} color={Colors.text} strokeWidth={2.2} />
                    <ThemedText type="smallBold">{formatTime(time)}</ThemedText>
                  </Pressable>
                  {form.times.length > 1 ? (
                    <Pressable
                      onPress={() => {
                        edit({ times: form.times.filter((other) => other !== time) });
                        setTimeEditor(null);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${formatTime(time)}`}
                      hitSlop={8}>
                      <X size={14} color={Colors.textSecondary} strokeWidth={2.4} />
                    </Pressable>
                  ) : null}
                </View>
              ))}
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
                      onPress={saveTime}
                    />
                  </View>
                </View>
              </View>
            ) : form.times.length < 8 ? (
              <>
                <Pressable
                  onPress={() => setTimeEditor({ index: null, value: suggestNextTime(form.times) })}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.dashed, pressed && formStyles.pressed]}>
                  <Plus size={16} color={Colors.text} strokeWidth={2.4} />
                  <ThemedText type="smallBold">Add a time</ThemedText>
                </Pressable>
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
              </>
            ) : null}
          </Section>

          <Section title="How often" icon={Repeat} tone="neutral">
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
                          styles.weekday,
                          on && styles.weekdayOn,
                          pressed && formStyles.pressed,
                        ]}>
                        <ThemedText type="smallBold" themeColor={on ? 'onInk' : 'textSecondary'}>
                          {letter}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
                <View style={styles.wrapRow}>
                  <SmallChip label="Weekdays" onPress={() => edit({ weekdays: [1, 2, 3, 4, 5] })} />
                  <SmallChip label="Weekends" onPress={() => edit({ weekdays: [0, 6] })} />
                  <SmallChip label="Mon, Wed, Fri" onPress={() => edit({ weekdays: [1, 3, 5] })} />
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
                <ThemedText type="bodyBold" style={styles.stepperText}>
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
              <ThemedText type="caption" themeColor="textSecondary">
                {form.frequency === 'monthly'
                  ? `${describeRepeat(form)}, counted from the start date.`
                  : 'One reminder on the day below.'}
              </ThemedText>
            ) : null}
          </Section>

          <Section title={form.frequency === 'once' ? 'Date' : 'Dates'} icon={CalendarDays} tone="primary">
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
                <ThemedText type="caption" themeColor="textSecondary" style={styles.label}>
                  For how long
                </ThemedText>
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
                {form.endsOn ? (
                  <DateRow
                    label="Last day"
                    value={formatDay(form.endsOn, today)}
                    open={calendar === 'end'}
                    onPress={() => setCalendar(calendar === 'end' ? null : 'end')}
                  />
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
          </Section>

          <Section title="Note" hint="Optional. Shown with the reminder." icon={NotebookPen} tone="neutral">
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

          <View style={styles.summary}>
            <BellRing size={18} color={Colors.primary} strokeWidth={2.2} />
            <ThemedText type="small" style={styles.flex}>
              {summarize(form, today)}
            </ThemedText>
          </View>

          {error ? (
            <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite">
              {error}
            </ThemedText>
          ) : null}

          <Button
            label={isNew ? 'Save medicine' : 'Save changes'}
            icon={BellRing}
            loading={busy}
            onPress={save}
          />

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

/** The page around the form: a warm wash, then a back bar. */
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
      <LinearGradient
        colors={['rgba(254, 241, 234, 0.9)', 'rgba(243, 247, 247, 0)']}
        style={styles.wash}
        pointerEvents="none"
      />
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StackHeader onBack={onBack} backLabel="Medicines" title={title} />
        {children}
      </SafeAreaView>
    </ThemedView>
  );
}

/** One part of the form on a white card, with an icon beside its title. */
function Section({
  title,
  hint,
  icon,
  tone = 'primary',
  children,
}: {
  title: string;
  hint?: string;
  icon?: LucideIcon;
  tone?: Tone;
  children: ReactNode;
}) {
  return (
    <Surface style={styles.section}>
      <View style={styles.sectionHeader}>
        {icon ? <IconTile icon={icon} tone={tone} size={36} /> : null}
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

/** Three of the form's cards while the medicine loads. */
function FormSkeleton() {
  return (
    <SkeletonGroup label="Loading this medicine" style={styles.skeletonStack}>
      {[0, 1, 2].map((i) => (
        <Surface key={i} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Skeleton width={36} height={36} radius={Radius.md} />
            <Skeleton width={120} height={15} />
          </View>
          <Skeleton height={52} radius={Radius.md + 2} />
          {i === 0 ? <Skeleton height={52} radius={Radius.md + 2} /> : null}
        </Surface>
      ))}
    </SkeletonGroup>
  );
}

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
        styles.smallChip,
        selected && styles.smallChipOn,
        pressed && formStyles.pressed,
      ]}>
      {icon ? <Plus size={12} color={Colors.textSecondary} strokeWidth={2.4} /> : null}
      <ThemedText type="caption" themeColor={selected ? 'onInk' : 'textSecondary'}>
        {label}
      </ThemedText>
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
        styles.stepButton,
        disabled && styles.disabled,
        pressed && formStyles.pressed,
      ]}>
      <Icon size={18} color={Colors.text} strokeWidth={2.4} />
    </Pressable>
  );
}

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
      style={({ pressed }) => [
        styles.dateRow,
        open && styles.dateRowOpen,
        pressed && formStyles.pressed,
      ]}>
      <CalendarDays size={18} color={Colors.textSecondary} strokeWidth={2.2} />
      <ThemedText type="small" themeColor="textSecondary" style={styles.flex}>
        {label}
      </ThemedText>
      <ThemedText type="smallBold">{value}</ThemedText>
    </Pressable>
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
  wash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 280,
  },
  skeletonStack: {
    gap: Spacing.three,
  },
  content: {
    gap: Spacing.three,
    padding: Spacing.three,
    paddingTop: Spacing.one,
  },
  section: {
    gap: Spacing.three - 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 4,
  },
  label: {
    marginTop: Spacing.one,
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
    paddingHorizontal: 10,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.border,
  },
  smallChipOn: {
    borderStyle: 'solid',
    borderColor: Colors.ink,
    backgroundColor: Colors.ink,
  },
  timePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 12,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Colors.successSoft,
    backgroundColor: Colors.successSoft,
  },
  timePillActive: {
    borderColor: Colors.success,
    backgroundColor: Colors.backgroundElement,
  },
  timePillMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingLeft: 12,
  },
  editor: {
    gap: Spacing.three - 4,
    padding: Spacing.three - 4,
    borderRadius: Radius.lg,
    backgroundColor: Colors.background,
  },
  editorActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  editorPrimary: {
    flex: 1.4,
  },
  dashed: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 46,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.primarySoft,
  },
  weekdays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  weekday: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  weekdayOn: {
    borderColor: Colors.ink,
    backgroundColor: Colors.ink,
    boxShadow: '0 6px 14px rgba(14, 42, 51, 0.22)',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 4,
  },
  stepperText: {
    flex: 1,
    textAlign: 'center',
  },
  stepButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundSelected,
  },
  disabled: {
    opacity: 0.35,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 2,
    minHeight: 52,
    paddingHorizontal: 14,
    borderRadius: Radius.md + 2,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  dateRowOpen: {
    borderColor: Colors.primary,
    boxShadow: '0 0 0 4px rgba(221, 67, 1, 0.12)',
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two + 2,
    padding: 14,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(221, 67, 1, 0.14)',
    backgroundColor: Colors.primarySoft,
  },
});
