import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  AlertCircle,
  Check,
  ChevronRight,
  CircleCheck,
  Pill,
  Plus,
  RotateCcw,
  Syringe,
  Video,
  type LucideIcon,
} from 'lucide-react-native';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Skeleton, SkeletonCircle, SkeletonGroup } from '@/components/ui/skeleton';
import { Colors, Fonts, Radius, Shadows, Spacing } from '@/constants/theme';
import { DoctorAvatar } from '@/features/doctors/doctor-avatar';
import { istParts, istToday } from '@/features/doctors/time';
import { type DoseState } from '@/features/reminders/dose-item';
import { describeDose, formatDay, formatTime, type Dose } from '@/features/reminders/schedule';

import { countdown, type TodayItem, type TodaySummary } from './today-summary';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** The ring's and day line's empty part, a warm grey that sits on the peach tint. */
const TRACK = '#EFE5DC';
/** A dose later today: a hollow dot. */
const LATER = '#CFC3B8';

const vaccineTitle = (name: string) => (/vaccin/i.test(name) ? name : `${name} vaccine`);

/** "3 doses and a vaccine left today", or how the day went. */
function headline(summary: TodaySummary) {
  const { total, taken, dosesLeft, vaccinesDue } = summary;
  const parts = [
    dosesLeft ? `${dosesLeft} ${dosesLeft === 1 ? 'dose' : 'doses'}` : null,
    vaccinesDue ? (vaccinesDue === 1 ? 'a vaccine' : `${vaccinesDue} vaccines`) : null,
  ].filter(Boolean);
  if (parts.length) return `${parts.join(' and ')} left today`;
  if (total) return taken === total ? 'Every dose taken today' : 'Today’s doses are done';
  return 'Nothing to take today';
}

/** Today's doses as a share of a circle, filling in when the card appears. */
function DoseRing({ taken, total }: { taken: number; total: number }) {
  const size = 72;
  const stroke = 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const fraction = total ? Math.min(taken / total, 1) : 0;
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(reduceMotion ? fraction : 0);

  useEffect(() => {
    progress.set(
      reduceMotion
        ? fraction
        : withTiming(fraction, { duration: 900, easing: Easing.out(Easing.cubic) }),
    );
  }, [fraction, progress, reduceMotion]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.get()),
  }));

  return (
    <View
      style={{ width: size, height: size }}
      accessible
      accessibilityLabel={`${taken} of ${total} doses taken`}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={TRACK}
          strokeWidth={stroke}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={Colors.primary}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
          fill="none"
          // Start at 12 o'clock instead of 3 o'clock.
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.ringCenter]}>
        <ThemedText style={styles.ringValue}>
          {taken}
          <ThemedText style={styles.ringTotal}>/{total}</ThemedText>
        </ThemedText>
        <ThemedText style={styles.ringLabel}>taken</ThemedText>
      </View>
    </View>
  );
}

const hourOf = (date: Date) => date.getHours() + date.getMinutes() / 60;

function hourLabel(hour: number) {
  const h = hour % 24;
  if (h === 0) return '12 AM';
  if (h === 12) return 'Noon';
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

const MARKER = 14;

function markerStyle(state: DoseState) {
  switch (state) {
    case 'taken':
      return styles.markerTaken;
    case 'due':
    case 'missed':
      return styles.markerDue;
    case 'skipped':
      return styles.markerSkipped;
    default:
      return styles.markerLater;
  }
}

/**
 * The day from early morning to night as a line: each dose sits at its time, filled once taken,
 * and the line is orange up to now. A consult today shows as a camera.
 */
function DayStrip({
  doses,
  consultAt,
  now,
}: {
  doses: TodaySummary['doses'];
  consultAt?: Date;
  now: Date;
}) {
  const [width, setWidth] = useState(0);
  const hours = [
    ...doses.map(({ dose }) => hourOf(dose.at)),
    ...(consultAt ? [hourOf(consultAt)] : []),
  ];
  const start = Math.floor(Math.min(6, ...hours));
  const end = Math.ceil(Math.max(23, ...hours.map((hour) => hour + 0.5)));
  const x = (hour: number) => MARKER / 2 + ((hour - start) / (end - start)) * (width - MARKER);
  const nowX = x(Math.min(Math.max(hourOf(now), start), end));
  const labels = [start, 12, 18, end].filter(
    (hour, i, all) => hour >= start && hour <= end && (i === 0 || hour - all[i - 1]! >= 3),
  );

  return (
    <View
      style={styles.strip}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      aria-hidden
      importantForAccessibility="no-hide-descendants">
      {width > 0 ? (
        <>
          <View style={[styles.trackLine, { left: MARKER / 2, right: MARKER / 2 }]} />
          <View
            style={[
              styles.trackLine,
              styles.trackDone,
              { left: MARKER / 2, width: nowX - MARKER / 2 },
            ]}
          />
          {doses.map(({ dose, state }) => (
            <View
              key={`${dose.reminder.id}-${dose.time}`}
              style={[
                styles.marker,
                markerStyle(state),
                { left: x(hourOf(dose.at)) - MARKER / 2 },
              ]}>
              {state === 'taken' ? <Check size={9} color={Colors.onInk} strokeWidth={4} /> : null}
            </View>
          ))}
          {consultAt ? (
            <View style={[styles.consultMarker, { left: x(hourOf(consultAt)) - 11 }]}>
              <Video size={12} color={Colors.onInk} strokeWidth={2.6} />
            </View>
          ) : null}
          {labels.map((hour) => (
            <ThemedText
              key={hour}
              style={[
                styles.stripLabel,
                hour === start
                  ? { left: 0 }
                  : hour === end
                    ? { right: 0 }
                    : { left: x(hour) - 22, width: 44, textAlign: 'center' },
              ]}>
              {hourLabel(hour)}
            </ThemedText>
          ))}
        </>
      ) : null}
    </View>
  );
}

/** A line on the card: an icon or photo, two lines of text and one action. */
function Row({
  leading,
  title,
  subtitle,
  trailing,
  onPress,
  accessibilityLabel,
}: {
  leading: ReactNode;
  title: string;
  subtitle: ReactNode;
  trailing: ReactNode;
  onPress?: () => void;
  /** Read for the whole line when the line is a button. */
  accessibilityLabel: string;
}) {
  const body = (
    <>
      {leading}
      <View style={styles.flex}>
        <ThemedText style={styles.rowTitle} numberOfLines={1}>
          {title}
        </ThemedText>
        <ThemedText style={styles.rowSubtitle} numberOfLines={2}>
          {subtitle}
        </ThemedText>
      </View>
      {trailing}
    </>
  );

  return onPress ? (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      {body}
    </Pressable>
  ) : (
    // Not grouped into one element, so a screen reader still reaches the line's own button.
    <View style={styles.row}>{body}</View>
  );
}

/** The card's one solid action per line: Take, Join. */
function ActionButton({
  label,
  icon: Icon,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  icon: LucideIcon;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}>
      <Icon size={15} color={Colors.onInk} strokeWidth={2.8} />
      <ThemedText style={styles.actionText}>{label}</ThemedText>
    </Pressable>
  );
}

function Chevron() {
  return (
    <View style={styles.chevron}>
      <ChevronRight size={17} color={Colors.textSoft} strokeWidth={2.4} />
    </View>
  );
}

const DOSE_FLAGS: Partial<Record<DoseState, string>> = {
  due: 'Due now',
  missed: 'Not marked',
};

function DoseLine({ dose, state, onTake }: { dose: Dose; state: DoseState; onTake: () => void }) {
  const flag = DOSE_FLAGS[state];
  // "Due now" already says when; a missed or later dose needs its time.
  const detail = [state === 'due' ? null : formatTime(dose.time), describeDose(dose.reminder)]
    .filter(Boolean)
    .join(' · ');

  return (
    <Row
      leading={
        <View style={styles.iconTile}>
          <Pill size={19} color={Colors.primary} strokeWidth={2.2} />
        </View>
      }
      title={dose.reminder.name}
      subtitle={
        <>
          {flag ? (
            <ThemedText style={[styles.flag, state === 'missed' && styles.flagMissed]}>
              {flag} ·{' '}
            </ThemedText>
          ) : null}
          {detail}
        </>
      }
      trailing={
        <ActionButton
          label="Take"
          icon={Check}
          onPress={onTake}
          accessibilityLabel={`Mark ${dose.reminder.name} taken`}
        />
      }
      accessibilityLabel={`${dose.reminder.name}, ${flag ? `${flag}, ` : ''}${detail}`}
    />
  );
}

function ConsultLine({ item, now }: { item: Extract<TodayItem, { kind: 'consult' }>; now: Date }) {
  const { appointment, running, canJoin } = item;
  const doctor = appointment.doctor?.name ?? 'Your doctor';
  const { date, time } = istParts(appointment.scheduledAt);
  const day = formatDay(date, istToday(now));
  const when = day === 'Today' ? formatTime(time) : `${day}, ${formatTime(time)}`;
  const untilStart = new Date(appointment.scheduledAt).getTime() - now.getTime();
  const status = running
    ? 'Your doctor is ready'
    : canJoin
      ? 'Waiting room open'
      : `Video consult · ${when} · in ${countdown(untilStart)}`;

  return (
    <Row
      leading={
        <View>
          <DoctorAvatar name={doctor} photoUrl={appointment.doctor?.photoUrl} size={42} />
          <View style={[styles.camBadge, canJoin && styles.camBadgeLive]}>
            <Video size={9} color={Colors.onInk} strokeWidth={3} />
          </View>
        </View>
      }
      // The person first: the time and countdown read underneath.
      title={doctor}
      subtitle={
        canJoin ? (
          <>
            <ThemedText style={styles.flagLive}>{status}</ThemedText> · {when}
          </>
        ) : (
          status
        )
      }
      trailing={
        canJoin ? (
          <ActionButton
            label="Join"
            icon={Video}
            onPress={() =>
              router.push({ pathname: '/consult/[id]', params: { id: appointment.id } })
            }
            accessibilityLabel={`Join video consult with ${doctor}`}
          />
        ) : (
          <Chevron />
        )
      }
      // With Join on the line, the line itself is not a second button around it.
      onPress={canJoin ? undefined : () => router.navigate('/care')}
      accessibilityLabel={`Video consult with ${doctor}, ${day} at ${formatTime(time)}. ${status}.`}
    />
  );
}

function VaccineLine({ item }: { item: Extract<TodayItem, { kind: 'vaccine' }> }) {
  const { vaccination, dose } = item.due;
  const overdue = dose.status === 'overdue';
  const detail = [`Dose ${dose.number} of ${vaccination.totalDoses}`, vaccination.doseText]
    .filter(Boolean)
    .join(' · ');

  return (
    <Row
      leading={
        <View style={[styles.iconTile, overdue && styles.iconTileOverdue]}>
          <Syringe size={18} color={overdue ? Colors.high : Colors.primary} strokeWidth={2.2} />
        </View>
      }
      title={vaccineTitle(vaccination.name)}
      subtitle={
        <>
          <ThemedText style={[styles.flag, overdue && styles.flagOverdue]}>
            {overdue ? 'Overdue' : 'Due'} ·{' '}
          </ThemedText>
          {detail}
        </>
      }
      trailing={<Chevron />}
      onPress={() =>
        router.push({ pathname: '/care/vaccine/[id]', params: { id: vaccination.id } })
      }
      accessibilityLabel={`${vaccineTitle(vaccination.name)}, ${overdue ? 'overdue' : 'due'}. ${detail}. Opens the vaccine record.`}
    />
  );
}

/** The card itself: white, lit warm from the top right, with the brand's petals in the corner. */
function Shell({ children }: { children: ReactNode }) {
  return (
    // The shadow sits outside the card, which clips its corners and gradients.
    <View style={styles.shadow}>
      <View style={styles.card}>
        <LinearGradient
          colors={[
            'rgba(250, 190, 160, 0.5)',
            'rgba(250, 190, 160, 0.12)',
            'rgba(250, 190, 160, 0)',
          ]}
          locations={[0, 0.35, 0.7]}
          start={{ x: 1, y: 0 }}
          end={{ x: 0.25, y: 0.75 }}
          style={[StyleSheet.absoluteFill, styles.noTouch]}
        />
        <Image
          source={require('@/assets/images/logo-mark.png')}
          style={styles.petals}
          contentFit="contain"
          accessibilityIgnoresInvertColors
          aria-hidden
        />
        {children}
      </View>
    </View>
  );
}

/** A dose just ticked off, with a way to take it back. */
export type JustTaken = { dose: Dose; onUndo: () => void };

type TodayHeroProps = {
  summary: TodaySummary;
  /** Today's label: "Mon, 12 Oct". */
  dateLabel: string;
  now: Date;
  onTake: (dose: Dose) => void;
  justTaken?: JustTaken | null;
  /** Saving a tick failed. */
  error?: string | null;
};

/**
 * The top of Home: how today's doses are going, the day at a glance, and the two things to do
 * next, each with its one action. Reads like a page of a care plan, not a list of alerts.
 */
export function TodayHero({ summary, dateLabel, now, onTake, justTaken, error }: TodayHeroProps) {
  const consult = summary.next.find((item) => item.kind === 'consult');
  const consultAt =
    consult?.kind === 'consult' && istParts(consult.appointment.scheduledAt).date === istToday(now)
      ? new Date(consult.appointment.scheduledAt)
      : undefined;

  return (
    <Shell>
      <View style={styles.top}>
        <View style={styles.flex}>
          <ThemedText style={styles.kicker}>Today · {dateLabel}</ThemedText>
          <ThemedText style={styles.headline} accessibilityRole="header">
            {headline(summary)}
          </ThemedText>
        </View>
        {summary.total ? <DoseRing taken={summary.taken} total={summary.total} /> : null}
      </View>

      {summary.total || consultAt ? (
        <DayStrip doses={summary.doses} consultAt={consultAt} now={now} />
      ) : null}

      {justTaken ? (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={styles.undo}>
          <CircleCheck size={17} color={Colors.good} strokeWidth={2.4} />
          <ThemedText style={styles.undoText} numberOfLines={1}>
            {justTaken.dose.reminder.name} marked taken
          </ThemedText>
          <Pressable
            onPress={justTaken.onUndo}
            accessibilityRole="button"
            accessibilityLabel={`Undo, ${justTaken.dose.reminder.name} not taken`}
            hitSlop={10}
            style={({ pressed }) => [styles.undoButton, pressed && styles.pressed]}>
            <RotateCcw size={13} color={Colors.primaryDeep} strokeWidth={2.6} />
            <ThemedText style={styles.undoButtonText}>Undo</ThemedText>
          </Pressable>
        </Animated.View>
      ) : null}

      {summary.next.length ? (
        <View style={styles.rows}>
          {summary.next.map((item) =>
            item.kind === 'dose' ? (
              <DoseLine
                key={`${item.dose.reminder.id}-${item.dose.time}`}
                dose={item.dose}
                state={item.state}
                onTake={() => onTake(item.dose)}
              />
            ) : item.kind === 'consult' ? (
              <ConsultLine key={item.appointment.id} item={item} now={now} />
            ) : (
              <VaccineLine key={item.due.vaccination.id} item={item} />
            ),
          )}
        </View>
      ) : null}

      {error ? (
        <View style={styles.error}>
          <AlertCircle size={15} color={Colors.high} strokeWidth={2.4} />
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </View>
      ) : null}

      <Pressable
        onPress={() => router.push('/care/medicines')}
        accessibilityRole="button"
        hitSlop={6}
        style={({ pressed }) => [styles.footer, pressed && styles.pressed]}>
        <ThemedText style={styles.footerText}>
          {summary.more ? `See ${summary.more} more for today` : 'All medicines and reminders'}
        </ThemedText>
        <ChevronRight size={16} color={Colors.primaryDeep} strokeWidth={2.4} />
      </Pressable>
    </Shell>
  );
}

/** Before any medicine is added: what the card will do, and the way to start. */
export function TodayHeroEmpty({
  dateLabel,
  consult,
  now,
}: {
  dateLabel: string;
  consult?: Extract<TodayItem, { kind: 'consult' }>;
  now: Date;
}) {
  return (
    <Shell>
      {/* Adding sits where the doses ring will be once there are medicines. */}
      <View style={styles.emptyTop}>
        <View style={styles.flex}>
          <ThemedText style={styles.kicker}>Today · {dateLabel}</ThemedText>
          <ThemedText style={styles.headline} accessibilityRole="header">
            Never miss a dose
          </ThemedText>
          <ThemedText style={styles.lede}>
            Add your medicines and we’ll remind you at the right time, every day.
          </ThemedText>
        </View>
        <Pressable
          onPress={() => router.push('/care/medicine/new')}
          accessibilityRole="button"
          accessibilityLabel="Add a medicine"
          hitSlop={6}
          style={({ pressed }) => [styles.addIcon, pressed && styles.addIconPressed]}>
          <Plus size={22} color={Colors.primaryDeep} strokeWidth={2.4} />
        </Pressable>
      </View>
      {consult ? (
        <View style={styles.rows}>
          <ConsultLine item={consult} now={now} />
        </View>
      ) : null}
    </Shell>
  );
}

/** Today couldn't load: say so on the card, with a way to try again. */
export function TodayHeroError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Shell>
      <View style={styles.flex}>
        <ThemedText style={styles.kicker}>Today</ThemedText>
        <ThemedText style={styles.headline} accessibilityRole="header">
          Couldn’t load today’s plan
        </ThemedText>
        <ThemedText style={styles.lede}>{message}</ThemedText>
      </View>
      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        style={({ pressed }) => [styles.retry, pressed && styles.pressed]}>
        <RotateCcw size={15} color={Colors.text} strokeWidth={2.4} />
        <ThemedText style={styles.retryText}>Try again</ThemedText>
      </Pressable>
    </Shell>
  );
}

/** The card's shape while today loads. */
export function TodayHeroSkeleton() {
  return (
    <Shell>
      <SkeletonGroup label="Loading today’s plan" style={styles.skeleton}>
        <View style={styles.top}>
          <View style={[styles.flex, styles.skeletonText]}>
            <Skeleton width={120} height={11} />
            <Skeleton width="85%" height={22} />
            <Skeleton width="45%" height={22} />
          </View>
          <SkeletonCircle size={72} />
        </View>
        <Skeleton height={8} radius={4} />
        <View style={styles.rows}>
          {[0, 1].map((i) => (
            <View key={i} style={styles.row}>
              <SkeletonCircle size={42} />
              <View style={[styles.flex, styles.skeletonText]}>
                <Skeleton width={i ? '55%' : '45%'} height={13} />
                <Skeleton width={i ? '70%' : '62%'} height={10} />
              </View>
              <Skeleton width={72} height={38} radius={Radius.pill} />
            </View>
          ))}
        </View>
      </SkeletonGroup>
    </Shell>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  pressed: {
    opacity: 0.6,
  },
  noTouch: {
    pointerEvents: 'none',
  },
  shadow: {
    borderRadius: Radius.xxl,
    boxShadow: Shadows.raised,
  },
  card: {
    gap: Spacing.three,
    padding: Spacing.three + 2,
    borderRadius: Radius.xxl,
    borderWidth: 1,
    borderColor: Colors.hairline,
    overflow: 'hidden',
    backgroundColor: Colors.backgroundElement,
  },
  petals: {
    position: 'absolute',
    top: -38,
    right: -46,
    width: 168,
    height: 150,
    opacity: 0.12,
    transform: [{ rotate: '14deg' }],
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  kicker: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: Colors.textFaint,
  },
  headline: {
    marginTop: 4,
    fontFamily: Fonts.displaySemibold,
    fontSize: 25,
    lineHeight: 30,
    letterSpacing: -0.5,
    color: Colors.text,
  },
  lede: {
    marginTop: 6,
    fontFamily: Fonts.regular,
    fontSize: 15,
    lineHeight: 21,
    color: Colors.textSoft,
  },
  ringCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringValue: {
    fontFamily: Fonts.displaySemibold,
    fontSize: 21,
    lineHeight: 24,
    color: Colors.text,
  },
  ringTotal: {
    fontFamily: Fonts.displaySemibold,
    fontSize: 14,
    color: Colors.textFaint,
  },
  ringLabel: {
    marginTop: -1,
    fontFamily: Fonts.semibold,
    fontSize: 11,
    lineHeight: 13,
    color: Colors.textFaint,
  },

  // Day strip
  strip: {
    height: MARKER + 22,
  },
  trackLine: {
    position: 'absolute',
    top: MARKER / 2 - 1.5,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: TRACK,
  },
  // The part of the day already gone, up to now.
  trackDone: {
    backgroundColor: Colors.primaryMid,
  },
  marker: {
    position: 'absolute',
    top: 0,
    width: MARKER,
    height: MARKER,
    borderRadius: MARKER / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerTaken: {
    backgroundColor: Colors.primary,
  },
  markerDue: {
    borderWidth: 3,
    borderColor: Colors.primary,
    backgroundColor: Colors.backgroundElement,
    boxShadow: '0 0 0 4px rgba(221, 67, 1, 0.14)',
  },
  markerLater: {
    borderWidth: 2.5,
    borderColor: LATER,
    backgroundColor: Colors.backgroundElement,
  },
  markerSkipped: {
    transform: [{ scale: 0.55 }],
    backgroundColor: LATER,
  },
  consultMarker: {
    position: 'absolute',
    top: -4,
    width: 22,
    height: 22,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.backgroundElement,
    backgroundColor: Colors.ink,
  },
  stripLabel: {
    position: 'absolute',
    top: MARKER + 7,
    fontFamily: Fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    color: Colors.textFaint,
  },

  // Rows
  rows: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
    minHeight: 68,
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 12,
    borderRadius: Radius.lg + 2,
    backgroundColor: Colors.well,
  },
  rowPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
  iconTile: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundElement,
  },
  iconTileOverdue: {
    backgroundColor: Colors.highSoft,
  },
  rowTitle: {
    fontFamily: Fonts.bold,
    fontSize: 15.5,
    lineHeight: 20,
    color: Colors.text,
  },
  rowSubtitle: {
    marginTop: 1,
    fontFamily: Fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSoft,
  },
  flag: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.primaryDeep,
  },
  flagMissed: {
    color: Colors.watch,
  },
  flagOverdue: {
    color: Colors.high,
  },
  flagLive: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.good,
  },
  camBadge: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.well,
    backgroundColor: Colors.ink,
  },
  camBadgeLive: {
    backgroundColor: Colors.good,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 40,
    paddingHorizontal: 15,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primaryDeep,
  },
  actionPressed: {
    backgroundColor: Colors.primaryInk,
    transform: [{ scale: 0.97 }],
  },
  actionText: {
    fontFamily: Fonts.bold,
    fontSize: 14.5,
    lineHeight: 19,
    color: Colors.onInk,
  },
  chevron: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.hairline,
    backgroundColor: Colors.backgroundElement,
  },
  undo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    paddingLeft: 12,
    paddingRight: 8,
    borderRadius: Radius.lg,
    backgroundColor: Colors.goodSoft,
  },
  undoText: {
    flex: 1,
    fontFamily: Fonts.semibold,
    fontSize: 13.5,
    lineHeight: 18,
    color: Colors.text,
  },
  undoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  undoButtonText: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    lineHeight: 18,
    color: Colors.primaryDeep,
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
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    marginTop: -4,
    marginBottom: -6,
    paddingVertical: 6,
  },
  footerText: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    lineHeight: 18,
    color: Colors.primaryDeep,
  },
  emptyTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  // Light: a white button with a peach edge and an orange plus, floating just off the card.
  addIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.primaryTintStrong,
    backgroundColor: Colors.backgroundElement,
    boxShadow: Shadows.soft,
  },
  addIconPressed: {
    backgroundColor: Colors.primaryTint,
    transform: [{ scale: 0.95 }],
  },
  retry: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    minHeight: 46,
    paddingHorizontal: 18,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.hairline,
    backgroundColor: Colors.backgroundElement,
  },
  retryText: {
    fontFamily: Fonts.bold,
    fontSize: 14.5,
    lineHeight: 19,
    color: Colors.text,
  },
  skeleton: {
    gap: Spacing.three,
  },
  skeletonText: {
    gap: 8,
  },
});
