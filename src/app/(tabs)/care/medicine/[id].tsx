import { router, useLocalSearchParams } from 'expo-router';
import { BellRing, CalendarDays, ChevronLeft, Clock, Minus, Plus, X } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { Chip } from '@/components/ui/chip';
import { Surface } from '@/components/ui/surface';
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

/** The first thing to fix before saving, if any. */
function problem(form: Form) {
  if (!form.name.trim()) return 'Enter the medicine name.';
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
  const { reminders, error: loadError, create, update, remove } = useReminders();
  const clearance = useTabBarClearance();
  // Fixed for the life of the form, so its defaults do not shift at midnight.
  const [today] = useState(() => toDateKey(new Date()));

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
        <View style={styles.loading}>
          {reminders && !existing ? (
            <ThemedText type="small" themeColor="textSecondary">
              This medicine no longer exists.
            </ThemedText>
          ) : loadError ? (
            <ThemedText type="small" themeColor="danger">
              {loadError}
            </ThemedText>
          ) : (
            <ActivityIndicator color={Colors.textSecondary} />
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
          <Section title="Medicine">
            <TextInput
              value={form.name}
              onChangeText={(name) => edit({ name })}
              placeholder="Name, e.g. Metformin"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="words"
              autoFocus={isNew}
              maxLength={60}
              editable={!busy}
              style={formStyles.input}
            />
            <TextInput
              value={form.dose}
              onChangeText={(dose) => edit({ dose })}
              placeholder="Dose, e.g. 500 mg (optional)"
              placeholderTextColor={Colors.textMuted}
              maxLength={40}
              editable={!busy}
              style={formStyles.input}
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

          <Section title="With food?">
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

          <Section title="Times" hint="You get a reminder at each time.">
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
                  <Pressable
                    onPress={() => setTimeEditor(null)}
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.secondaryAction,
                      pressed && formStyles.pressed,
                    ]}>
                    <ThemedText type="smallBold">Cancel</ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={saveTime}
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.primaryAction, pressed && formStyles.pressed]}>
                    <ThemedText type="smallBold" themeColor="onInk">
                      {timeEditor.index === null ? 'Add time' : 'Update time'}
                    </ThemedText>
                  </Pressable>
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

          <Section title="How often">
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

          <Section title={form.frequency === 'once' ? 'Date' : 'Dates'}>
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

          <Section title="Note" hint="Optional. Shown with the reminder.">
            <TextInput
              value={form.note}
              onChangeText={(note) => edit({ note })}
              placeholder="e.g. Take with a full glass of water"
              placeholderTextColor={Colors.textMuted}
              maxLength={120}
              multiline
              editable={!busy}
              style={[formStyles.input, styles.note]}
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

          <Pressable
            onPress={save}
            disabled={busy}
            accessibilityRole="button"
            accessibilityState={{ disabled: busy, busy }}
            style={({ pressed }) => [styles.save, pressed && formStyles.pressed]}>
            {busy ? (
              <ActivityIndicator color={Colors.onInk} />
            ) : (
              <ThemedText type="smallBold" themeColor="onInk">
                {isNew ? 'Save medicine' : 'Save changes'}
              </ThemedText>
            )}
          </Pressable>

          {!isNew ? (
            <Pressable
              onPress={deleteMedicine}
              disabled={busy}
              accessibilityRole="button"
              hitSlop={8}
              style={styles.delete}>
              <ThemedText type="smallBold" themeColor="danger">
                Delete medicine
              </ThemedText>
            </Pressable>
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
            style={({ pressed }) => [styles.round, pressed && formStyles.pressed]}>
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
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.three,
  },
  content: {
    gap: Spacing.three,
    padding: Spacing.three,
    paddingTop: Spacing.one,
  },
  section: {
    gap: Spacing.two + 4,
    padding: Spacing.three,
  },
  sectionHeader: {
    gap: 2,
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
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundSelected,
  },
  timePillActive: {
    borderColor: Colors.ink,
  },
  timePillMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingLeft: 12,
  },
  editor: {
    gap: Spacing.two,
    padding: Spacing.two,
    borderRadius: Radius.md,
    backgroundColor: Colors.background,
  },
  editorActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  secondaryAction: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
  },
  primaryAction: {
    flex: 1.4,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.ink,
  },
  dashed: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 46,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.border,
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
    borderWidth: 1,
    borderColor: Colors.border,
  },
  weekdayOn: {
    borderColor: Colors.ink,
    backgroundColor: Colors.ink,
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
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dateRowOpen: {
    borderColor: Colors.ink,
  },
  note: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two + 2,
    padding: 14,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primarySoft,
  },
  save: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
  },
  delete: {
    alignSelf: 'center',
    paddingVertical: Spacing.two,
  },
});
