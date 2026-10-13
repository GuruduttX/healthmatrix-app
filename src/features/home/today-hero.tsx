import { Image, type ImageSource } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  AlertCircle,
  Check,
  ChevronRight,
  CircleCheck,
  Plus,
  RotateCcw,
  Video,
  type LucideIcon,
} from 'lucide-react-native';
import { Fragment, useEffect, type ReactNode } from 'react';
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

/** The ring's empty part, a warm grey. */
const TRACK = '#EFE5DC';
/** The ring, the dishes and the doctor's photo at the start of each line share one size. */
const LEAD = 34;

/** Microsoft Fluent Emoji (MIT), as on Home's quick actions; see assets/images/home/3d/LICENSE. */
const PILL = require('@/assets/images/home/3d/medicine.png');
const SYRINGE = require('@/assets/images/home/3d/syringe.png');

const vaccineTitle = (name: string) => (/vaccin/i.test(name) ? name : `${name} vaccine`);

const openMedicines = () => router.push('/care/medicines');

/** "2 doses left today", "3 doses, 1 vaccine left", or how the day went: one line on a phone. */
function headline(summary: TodaySummary) {
  const { total, taken, dosesLeft, vaccinesDue } = summary;
  const parts = [
    dosesLeft ? `${dosesLeft} ${dosesLeft === 1 ? 'dose' : 'doses'}` : null,
    vaccinesDue ? `${vaccinesDue} ${vaccinesDue === 1 ? 'vaccine' : 'vaccines'}` : null,
  ].filter(Boolean);
  if (parts.length === 2) return `${parts.join(', ')} left`;
  if (dosesLeft) return `${parts[0]} left today`;
  if (vaccinesDue) return `${parts[0]} due`;
  if (total) return taken === total ? 'Every dose taken today' : 'Today’s doses are done';
  return 'Nothing to take today';
}

/** Today's doses as a share of a circle, filling in when the card appears. */
function DoseRing({ taken, total }: { taken: number; total: number }) {
  const stroke = 3.5;
  const radius = (LEAD - stroke) / 2;
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
    <View style={styles.lead}>
      <Svg width={LEAD} height={LEAD}>
        <Circle
          cx={LEAD / 2}
          cy={LEAD / 2}
          r={radius}
          stroke={TRACK}
          strokeWidth={stroke}
          fill="none"
        />
        <AnimatedCircle
          cx={LEAD / 2}
          cy={LEAD / 2}
          r={radius}
          stroke={Colors.primary}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
          fill="none"
          // Start at 12 o'clock instead of 3 o'clock.
          transform={`rotate(-90 ${LEAD / 2} ${LEAD / 2})`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <ThemedText style={styles.ringValue}>
          {taken}
          <ThemedText style={styles.ringTotal}>/{total}</ThemedText>
        </ThemedText>
      </View>
    </View>
  );
}

/** A 3D picture in a round, neutral dish. */
function Dish({ art, size = 21 }: { art: ImageSource; size?: number }) {
  return (
    <View style={[styles.lead, styles.dish]}>
      <Image
        source={art}
        style={{ width: size, height: size }}
        contentFit="contain"
        accessibilityIgnoresInvertColors
        aria-hidden
      />
    </View>
  );
}

function Chevron() {
  return <ChevronRight size={18} color={Colors.textFaint} strokeWidth={2.4} />;
}

/** The card's top, one line: how today is going, and the way to every medicine and reminder. */
function Header({
  leading,
  title,
  more,
  accessibilityLabel,
}: {
  leading: ReactNode;
  title: string;
  /** "1 more": open items that did not make the card. */
  more?: string;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      onPress={openMedicines}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.header, pressed && styles.pressed]}>
      {leading}
      <ThemedText style={[styles.flex, styles.title]} numberOfLines={1}>
        {title}
      </ThemedText>
      {more ? <ThemedText style={styles.more}>{more}</ThemedText> : null}
      <Chevron />
    </Pressable>
  );
}

/** A line on the card: a picture or photo, a name with one line under it, and one action. */
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
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      {body}
    </Pressable>
  ) : (
    // Not grouped into one element, so a screen reader still reaches the line's own button.
    <View style={styles.row}>{body}</View>
  );
}

/** Ticks a dose off: a round button, solid when the dose is due now, soft otherwise. */
function TakeButton({
  solid,
  onPress,
  accessibilityLabel,
}: {
  solid: boolean;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={({ pressed }) => [
        styles.take,
        solid ? styles.actionSolid : styles.takeSoft,
        pressed && (solid ? styles.actionSolidPressed : styles.actionSoftPressed),
      ]}>
      <Check size={16} color={solid ? Colors.onInk : Colors.primaryDeep} strokeWidth={3} />
    </Pressable>
  );
}

/** A line's one action with a word on it: Join, Retry. Solid when it is the thing to do now. */
function ActionButton({
  label,
  icon: Icon,
  solid,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  icon: LucideIcon;
  solid?: boolean;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={({ pressed }) => [
        styles.action,
        solid ? styles.actionSolid : styles.actionSoft,
        pressed && (solid ? styles.actionSolidPressed : styles.actionSoftPressed),
      ]}>
      <Icon size={14} color={solid ? Colors.onInk : Colors.primaryDeep} strokeWidth={2.8} />
      <ThemedText style={[styles.actionText, !solid && styles.actionTextSoft]}>{label}</ThemedText>
    </Pressable>
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
      leading={<Dish art={PILL} />}
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
        <TakeButton
          solid={state === 'due'}
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
          <DoctorAvatar name={doctor} photoUrl={appointment.doctor?.photoUrl} size={LEAD} />
          <View style={[styles.camBadge, canJoin && styles.camBadgeLive]}>
            <Video size={8} color={Colors.onInk} strokeWidth={3} />
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
            solid
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
      leading={<Dish art={SYRINGE} size={19} />}
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

/** Lines under the header, a hairline between each. */
function Lines({ children }: { children: ReactNode[] }) {
  return (
    <View style={styles.lines}>
      {children.map((child, i) => (
        <Fragment key={i}>
          {i ? <View style={styles.divider} /> : null}
          {child}
        </Fragment>
      ))}
    </View>
  );
}

/** The card itself: white, with a faint warm light in the top right corner. */
function Shell({ children }: { children: ReactNode }) {
  return (
    // The shadow sits outside the card, which clips its corners and gradient.
    <View style={styles.shadow}>
      <View style={styles.card}>
        <LinearGradient
          colors={['rgba(250, 190, 160, 0.3)', 'rgba(250, 190, 160, 0)']}
          locations={[0, 0.5]}
          start={{ x: 1, y: 0 }}
          end={{ x: 0.3, y: 0.7 }}
          style={[StyleSheet.absoluteFill, styles.noTouch]}
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
  now: Date;
  onTake: (dose: Dose) => void;
  justTaken?: JustTaken | null;
  /** Saving a tick failed. */
  error?: string | null;
};

/**
 * Today on Home, kept compact: how the day's doses are going in one line, then the two things to
 * do next, each with its one action. The header opens every medicine and reminder.
 */
export function TodayHero({ summary, now, onTake, justTaken, error }: TodayHeroProps) {
  const title = headline(summary);
  const more = summary.more ? `${summary.more} more` : undefined;
  const progress = summary.total ? `${summary.taken} of ${summary.total} doses taken. ` : '';

  return (
    <Shell>
      <Header
        leading={
          summary.total ? (
            <DoseRing taken={summary.taken} total={summary.total} />
          ) : (
            <Dish art={summary.vaccinesDue ? SYRINGE : PILL} />
          )
        }
        title={title}
        more={more}
        accessibilityLabel={`${title}. ${progress}${more ? `${more}. ` : ''}Opens all medicines and reminders.`}
      />

      {justTaken ? (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={styles.undo}>
          <CircleCheck size={16} color={Colors.good} strokeWidth={2.4} />
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
        <>
          <View style={styles.rule} />
          <Lines>
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
          </Lines>
        </>
      ) : null}

      {error ? (
        <View style={styles.error}>
          <AlertCircle size={15} color={Colors.high} strokeWidth={2.4} />
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </View>
      ) : null}
    </Shell>
  );
}

/** Before any medicine is added: what the card will do, and the way to start. */
export function TodayHeroEmpty({
  consult,
  now,
}: {
  consult?: Extract<TodayItem, { kind: 'consult' }>;
  now: Date;
}) {
  return (
    <Shell>
      <View style={styles.header}>
        <Dish art={PILL} />
        <View style={styles.flex}>
          <ThemedText style={styles.title} accessibilityRole="header">
            Never miss a dose
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Add your medicines and we’ll remind you on time.
          </ThemedText>
        </View>
        <Pressable
          onPress={() => router.push('/care/medicine/new')}
          accessibilityRole="button"
          accessibilityLabel="Add a medicine"
          hitSlop={6}
          style={({ pressed }) => [styles.addIcon, pressed && styles.addIconPressed]}>
          <Plus size={18} color={Colors.primaryDeep} strokeWidth={2.4} />
        </Pressable>
      </View>
      {consult ? (
        <>
          <View style={styles.rule} />
          <ConsultLine item={consult} now={now} />
        </>
      ) : null}
    </Shell>
  );
}

/** Today couldn't load: say so on the card, with a way to try again. */
export function TodayHeroError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Shell>
      <View style={styles.header}>
        <View style={[styles.lead, styles.dish, styles.dishAlert]}>
          <AlertCircle size={17} color={Colors.high} strokeWidth={2.2} />
        </View>
        <View style={styles.flex}>
          <ThemedText style={styles.title} accessibilityRole="header">
            Couldn’t load today
          </ThemedText>
          <ThemedText style={styles.subtitle} numberOfLines={2}>
            {message}
          </ThemedText>
        </View>
        <ActionButton
          label="Retry"
          icon={RotateCcw}
          onPress={onRetry}
          accessibilityLabel="Try loading today again"
        />
      </View>
    </Shell>
  );
}

/** The card's shape while today loads. */
export function TodayHeroSkeleton() {
  return (
    <Shell>
      <SkeletonGroup label="Loading today’s plan">
        <View style={styles.header}>
          <SkeletonCircle size={LEAD} />
          <View style={styles.flex}>
            <Skeleton width="60%" height={15} />
          </View>
        </View>
        <View style={styles.rule} />
        {[0, 1].map((i) => (
          <Fragment key={i}>
            {i ? <View style={styles.divider} /> : null}
            <View style={styles.row}>
              <SkeletonCircle size={LEAD} />
              <View style={[styles.flex, styles.skeletonText]}>
                <Skeleton width={i ? '55%' : '45%'} height={13} />
                <Skeleton width={i ? '70%' : '62%'} height={10} />
              </View>
              <SkeletonCircle size={34} />
            </View>
          </Fragment>
        ))}
      </SkeletonGroup>
    </Shell>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  noTouch: {
    pointerEvents: 'none',
  },
  shadow: {
    borderRadius: Radius.xl,
    boxShadow: Shadows.soft,
  },
  card: {
    paddingHorizontal: Spacing.three - 2,
    paddingVertical: Spacing.three - 4,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.hairline,
    overflow: 'hidden',
    backgroundColor: Colors.backgroundElement,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 6,
  },
  title: {
    fontFamily: Fonts.displaySemibold,
    fontSize: 16.5,
    lineHeight: 21,
    letterSpacing: -0.3,
    color: Colors.text,
  },
  more: {
    marginRight: -6,
    fontFamily: Fonts.semibold,
    fontSize: 12.5,
    lineHeight: 16,
    color: Colors.textFaint,
  },
  subtitle: {
    marginTop: 1,
    fontFamily: Fonts.medium,
    fontSize: 13,
    lineHeight: 17,
    color: Colors.textFaint,
  },
  lead: {
    width: LEAD,
    height: LEAD,
  },
  ringValue: {
    fontFamily: Fonts.displaySemibold,
    fontSize: 11.5,
    lineHeight: 14,
    color: Colors.text,
  },
  ringTotal: {
    fontFamily: Fonts.displaySemibold,
    fontSize: 9,
    lineHeight: 14,
    color: Colors.textFaint,
  },
  dish: {
    borderRadius: LEAD / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.well,
  },
  dishAlert: {
    backgroundColor: Colors.highSoft,
  },

  // Lines
  rule: {
    height: StyleSheet.hairlineWidth,
    marginTop: Spacing.two + 2,
    marginHorizontal: -(Spacing.three - 2),
    backgroundColor: Colors.hairline,
  },
  // The last line's own padding is most of the card's bottom edge.
  lines: {
    marginBottom: -5,
  },
  // Starts where the words do, like a list's separators.
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: LEAD + Spacing.three - 6,
    backgroundColor: Colors.hairline,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 6,
    paddingVertical: 7,
  },
  rowTitle: {
    fontFamily: Fonts.bold,
    fontSize: 14.5,
    lineHeight: 18.5,
    color: Colors.text,
  },
  rowSubtitle: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textSoft,
  },
  // Nested in the subtitle: each sets its line height, or ThemedText's default 24 makes the line tall.
  flag: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    lineHeight: 16,
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
    fontSize: 12,
    lineHeight: 16,
    color: Colors.good,
  },
  camBadge: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.backgroundElement,
    backgroundColor: Colors.ink,
  },
  camBadgeLive: {
    backgroundColor: Colors.good,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 32,
    paddingHorizontal: 13,
    borderRadius: Radius.pill,
  },
  take: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionSolid: {
    backgroundColor: Colors.primaryDeep,
  },
  actionSolidPressed: {
    backgroundColor: Colors.primaryInk,
    transform: [{ scale: 0.97 }],
  },
  actionSoft: {
    backgroundColor: Colors.primaryTint,
  },
  // Like a checkbox waiting for a tick: white, with a peach ring.
  takeSoft: {
    borderWidth: 1.5,
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.backgroundElement,
  },
  actionSoftPressed: {
    backgroundColor: Colors.primaryTintStrong,
    transform: [{ scale: 0.97 }],
  },
  actionText: {
    fontFamily: Fonts.bold,
    fontSize: 13.5,
    lineHeight: 18,
    color: Colors.onInk,
  },
  actionTextSoft: {
    color: Colors.primaryDeep,
  },
  undo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 38,
    marginTop: Spacing.three - 4,
    paddingLeft: 12,
    paddingRight: 6,
    borderRadius: Radius.md,
    backgroundColor: Colors.goodSoft,
  },
  undoText: {
    flex: 1,
    fontFamily: Fonts.semibold,
    fontSize: 13,
    lineHeight: 17,
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
    fontSize: 13.5,
    lineHeight: 18,
    color: Colors.primaryDeep,
  },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.two,
  },
  errorText: {
    flex: 1,
    fontFamily: Fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.high,
  },
  // A white button with a peach edge and an orange plus.
  addIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
  skeletonText: {
    gap: 8,
  },
});
