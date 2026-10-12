import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Bell, Check, ChevronRight, CircleCheck, Pill, Plus, Syringe } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconTile } from '@/components/ui/icon-tile';
import { Skeleton, SkeletonCircle, SkeletonGroup } from '@/components/ui/skeleton';
import { Surface } from '@/components/ui/surface';
import { Tag } from '@/components/ui/tag';
import { Colors, Fonts, Radius, Shadows, Spacing } from '@/constants/theme';
import { type VaccinationRecord, type VaccineDose } from '@/features/vaccines/types';

import { doseState, type DoseState } from './dose-item';
import { describeDose, formatTime, type Dose } from './schedule';

// Today's doses as a timeline card, shared by Home's "Today" and the Care tab's "Medicines today",
// with the card's loading, empty and nothing-due states.

const vaccineTitle = (name: string) => (/vaccin/i.test(name) ? name : `${name} vaccine`);

const STATE_COLORS: Record<DoseState, string> = {
  taken: Colors.success,
  skipped: Colors.textMuted,
  due: Colors.primary,
  missed: Colors.warning,
  later: Colors.border,
  upcoming: Colors.border,
};

const STATE_LABELS: Partial<Record<DoseState, string>> = {
  taken: 'Taken',
  skipped: 'Skipped',
  due: 'Due now',
  missed: 'Not marked',
};

/** Where a row sits on the timeline, so the rail starts and ends at the first and last dots. */
type RailPosition = { first: boolean; last: boolean };

function Rail({ color, filled, first, last }: RailPosition & { color: string; filled: boolean }) {
  return (
    <View style={styles.rail}>
      <View style={[styles.railLine, first && styles.railFromMiddle, last && styles.railToMiddle]} />
      <View
        style={[
          styles.node,
          { borderColor: color },
          filled && { backgroundColor: color },
          color === Colors.primary && styles.nodeHalo,
        ]}
      />
    </View>
  );
}

type DoseRowProps = RailPosition & {
  dose: Dose;
  state: DoseState;
  onToggle: () => void;
};

function DoseRow({ dose, state, first, last, onToggle }: DoseRowProps) {
  const done = dose.status === 'taken';
  const label = STATE_LABELS[state];
  const detail = describeDose(dose.reminder);
  const color = STATE_COLORS[state];

  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={`${dose.reminder.name}, ${formatTime(dose.time)}${label ? `, ${label}` : ''}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <ThemedText
        style={[styles.time, state === 'due' && styles.timeDue]}
        numberOfLines={1}>
        {formatTime(dose.time)}
      </ThemedText>
      <Rail color={color} filled={done} first={first} last={last} />
      <View style={styles.flex}>
        <ThemedText
          type="smallBold"
          numberOfLines={1}
          themeColor={dose.status ? 'textSecondary' : 'text'}
          style={dose.status === 'skipped' && styles.struck}>
          {dose.reminder.name}
        </ThemedText>
        {label || detail ? (
          <ThemedText type="caption" themeColor="textMuted" numberOfLines={1}>
            {label ? (
              <ThemedText type="caption" style={[styles.semibold, { color }]}>
                {label}
              </ThemedText>
            ) : null}
            {label && detail ? ' · ' : ''}
            {detail}
          </ThemedText>
        ) : null}
      </View>
      <View style={[styles.check, done && styles.checkDone]}>
        {done ? <Check size={14} color={Colors.onInk} strokeWidth={3} /> : null}
      </View>
    </Pressable>
  );
}

type VaccineRowProps = RailPosition & { vaccination: VaccinationRecord; dose: VaccineDose };

function VaccineRow({ vaccination, dose, first, last }: VaccineRowProps) {
  const overdue = dose.status === 'overdue';
  const color = overdue ? Colors.danger : Colors.primary;

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/care/vaccine/[id]', params: { id: vaccination.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${vaccineTitle(vaccination.name)}, dose ${dose.number} ${overdue ? 'overdue' : 'due'}`}
      accessibilityHint="Opens the vaccine record"
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <ThemedText style={[styles.time, { color }]} numberOfLines={1}>
        {overdue ? 'Overdue' : 'Due'}
      </ThemedText>
      <Rail color={color} filled={false} first={first} last={last} />
      <View style={styles.flex}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {vaccineTitle(vaccination.name)}
        </ThemedText>
        <ThemedText type="caption" themeColor="textMuted" numberOfLines={1}>
          Dose {dose.number} of {vaccination.totalDoses}
          {vaccination.doseText ? ` · ${vaccination.doseText}` : ''}
        </ThemedText>
      </View>
      <View style={[styles.vaccineIcon, { backgroundColor: overdue ? Colors.dangerSoft : Colors.primarySoft }]}>
        <Syringe size={14} color={color} strokeWidth={2.4} />
      </View>
    </Pressable>
  );
}

/** The gradient's far corner: a touch of amber, so the card never fades to plain white. */
const WARM_WHITE = '#FFF9EF';

/** Before any medicine is added: a peek at what a reminder looks like, and the way to add one. */
export function NoMedicinesCard() {
  return (
    // The shadow sits outside the card, which clips its corners and gradient.
    <View style={styles.inviteShadow}>
      <View style={styles.invite}>
        <LinearGradient
          colors={[Colors.warningSoft, WARM_WHITE]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.inviteText}>
          <ThemedText type="bodyBold">Never miss a dose</ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            Add your medicines and we’ll remind you at the right time.
          </ThemedText>
          <Pressable
            onPress={() => router.push('/care/medicine/new')}
            accessibilityRole="button"
            style={({ pressed }) => [styles.addMedicine, pressed && styles.pressed]}>
            <Plus size={15} color={Colors.onInk} strokeWidth={2.6} />
            <ThemedText type="caption" style={styles.addMedicineText}>
              Add medicine
            </ThemedText>
          </Pressable>
        </View>

        <View style={styles.peek} aria-hidden importantForAccessibility="no-hide-descendants">
          <View style={styles.peekBack} />
          <View style={styles.peekCard}>
            <View style={styles.peekIcon}>
              <Pill size={14} color={Colors.warning} strokeWidth={2.4} />
            </View>
            <View style={styles.flex}>
              <ThemedText style={styles.peekTime}>8:00 AM</ThemedText>
              <ThemedText style={styles.peekLabel} numberOfLines={1}>
                Time to take
              </ThemedText>
            </View>
          </View>
          <View style={styles.peekBell}>
            <Bell size={11} color={Colors.onInk} strokeWidth={2.6} />
          </View>
        </View>
      </View>
    </View>
  );
}

/** The medicines card's shape while it loads: header, progress bar and three timeline rows. */
export function MedicinesSkeleton() {
  return (
    <SkeletonGroup label="Loading today’s medicines" style={styles.skeletonCard}>
      <View style={styles.headerRow}>
        <View style={styles.skeletonTitle}>
          <Skeleton width={110} height={16} />
          <Skeleton width={70} height={11} />
        </View>
        <Skeleton width={72} height={22} radius={Radius.pill} />
      </View>
      <Skeleton height={6} radius={3} />
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.skeletonRow}>
          <Skeleton width={TIME_WIDTH - 10} height={12} />
          <SkeletonCircle size={12} />
          <View style={styles.skeletonTitle}>
            <Skeleton height={13} width={i === 1 ? '45%' : '60%'} />
            <Skeleton height={10} width={i === 1 ? '65%' : '40%'} />
          </View>
          <SkeletonCircle size={26} />
        </View>
      ))}
    </SkeletonGroup>
  );
}

function FooterLink({ label }: { label: string }) {
  return (
    <Pressable
      onPress={() => router.push('/care/medicines')}
      accessibilityRole="button"
      style={({ pressed }) => [styles.footer, pressed && styles.pressed]}>
      <ThemedText type="smallBold" themeColor="primary">
        {label}
      </ThemedText>
      <ChevronRight size={16} color={Colors.primary} strokeWidth={2.4} />
    </Pressable>
  );
}

/** A vaccine dose that is due or overdue, shown after the doses. */
export type VaccineDue = { vaccination: VaccinationRecord; dose: VaccineDose };

/** Nothing scheduled today, with a way to the medicines screen. */
export function NothingDueCard({ includesVaccines = false }: { includesVaccines?: boolean }) {
  return (
    <Surface style={styles.calm}>
      <IconTile icon={CircleCheck} tone="success" size={44} />
      <View style={styles.flex}>
        <ThemedText type="bodyBold">Nothing due today</ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          {includesVaccines
            ? 'No medicines or vaccines scheduled. Enjoy your day.'
            : 'No medicines scheduled today. Enjoy your day.'}
        </ThemedText>
      </View>
      <Pressable
        onPress={() => router.push('/care/medicines')}
        accessibilityRole="button"
        accessibilityLabel="Manage medicines"
        hitSlop={8}>
        <ChevronRight size={20} color={Colors.textMuted} strokeWidth={2.2} />
      </Pressable>
    </Surface>
  );
}

type MedicinesTimelineCardProps = {
  /** All of today's doses; only the first `maxDoses` are listed. */
  doses: Dose[];
  vaccinesDue?: VaccineDue[];
  now: Date;
  /** Today's date key. */
  today: string;
  onToggle: (dose: Dose) => void;
  /** Saving a tick failed. */
  error?: string | null;
  maxDoses?: number;
};

/**
 * Today's doses on a timeline with a progress bar (tap a dose to tick it off), then any vaccine
 * that is due, and a link to every medicine.
 */
export function MedicinesTimelineCard({
  doses,
  vaccinesDue = [],
  now,
  today,
  onToggle,
  error: markError,
  maxDoses = 6,
}: MedicinesTimelineCardProps) {
  const shown = doses.slice(0, maxDoses);
  const taken = doses.filter((dose) => dose.status === 'taken').length;
  const toTake = doses.filter(
    (dose) => !dose.status && ['due', 'missed'].includes(doseState(dose, now, today)),
  ).length;
  const rows = shown.length + vaccinesDue.length;

  return (
    <Surface style={styles.card}>
      {doses.length ? (
        <View style={styles.cardHeader}>
          <View style={styles.headerRow}>
            <View style={styles.flex}>
              <ThemedText type="bodyBold">Medicines</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                {taken} of {doses.length} taken
              </ThemedText>
            </View>
            {toTake > 0 ? (
              <Tag label={`${toTake} to take`} tone="warning" />
            ) : taken === doses.length ? (
              <Tag label="All taken" tone="success" icon={Check} />
            ) : null}
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${(taken / doses.length) * 100}%` }]} />
          </View>
        </View>
      ) : (
        <View style={styles.cardHeader}>
          <ThemedText type="bodyBold">Vaccines due</ThemedText>
        </View>
      )}

      <View>
        {shown.map((dose, index) => (
          <DoseRow
            key={`${dose.reminder.id}-${dose.time}`}
            dose={dose}
            state={doseState(dose, now, today)}
            first={index === 0}
            last={index === rows - 1}
            onToggle={() => onToggle(dose)}
          />
        ))}
        {vaccinesDue.map(({ vaccination, dose }, index) => (
          <VaccineRow
            key={vaccination.id}
            vaccination={vaccination}
            dose={dose}
            first={shown.length + index === 0}
            last={shown.length + index === rows - 1}
          />
        ))}
      </View>

      {markError ? (
        <ThemedText type="caption" themeColor="danger">
          {markError}
        </ThemedText>
      ) : null}

      <FooterLink
        label={
          doses.length > shown.length
            ? `See all ${doses.length} doses`
            : 'All medicines and reminders'
        }
      />
    </Surface>
  );
}

const TIME_WIDTH = 62;

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  semibold: {
    fontFamily: Fonts.semibold,
  },
  pressed: {
    opacity: 0.65,
  },

  // Doses and vaccines
  skeletonCard: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.lg + 4,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
    boxShadow: Shadows.card,
  },
  skeletonTitle: {
    flex: 1,
    gap: 7,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 2,
    minHeight: 40,
  },
  inviteShadow: {
    borderRadius: Radius.lg + 4,
    boxShadow: Shadows.card,
  },
  invite: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.lg + 4,
    borderWidth: 1,
    borderColor: 'rgba(181, 120, 10, 0.18)',
    backgroundColor: WARM_WHITE,
    overflow: 'hidden',
  },
  inviteText: {
    flex: 1,
    gap: 3,
  },
  addMedicine: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    marginTop: Spacing.two + 2,
    paddingVertical: 8,
    paddingLeft: 12,
    paddingRight: 14,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primary,
    boxShadow: Shadows.glow,
  },
  addMedicineText: {
    fontFamily: Fonts.bold,
    color: Colors.onInk,
  },
  // A small mock reminder, a card tilted behind it and a bell badge.
  peek: {
    width: 118,
    height: 84,
  },
  peekBack: {
    position: 'absolute',
    top: 8,
    left: 14,
    right: 0,
    height: 44,
    borderRadius: Radius.md + 2,
    borderWidth: 1,
    borderColor: 'rgba(181, 120, 10, 0.14)',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    transform: [{ rotate: '-7deg' }],
  },
  peekCard: {
    position: 'absolute',
    top: 28,
    left: 0,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    padding: 8,
    borderRadius: Radius.md + 2,
    backgroundColor: Colors.backgroundElement,
    boxShadow: '0 6px 16px rgba(14, 42, 51, 0.12)',
  },
  peekIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.warningSoft,
  },
  peekTime: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    lineHeight: 15,
    color: Colors.text,
  },
  peekLabel: {
    fontFamily: Fonts.medium,
    fontSize: 10,
    lineHeight: 13,
    color: Colors.textMuted,
  },
  peekBell: {
    position: 'absolute',
    top: 18,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.backgroundElement,
    backgroundColor: Colors.primary,
  },
  calm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 4,
  },
  card: {
    gap: Spacing.two,
    paddingBottom: 0,
  },
  cardHeader: {
    gap: Spacing.two + 2,
    paddingBottom: Spacing.one,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: Colors.backgroundSelected,
  },
  fill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: Colors.success,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 2,
    minHeight: 54,
  },
  time: {
    width: TIME_WIDTH,
    fontFamily: Fonts.semibold,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textSecondary,
  },
  timeDue: {
    color: Colors.primary,
    fontFamily: Fonts.bold,
  },
  rail: {
    width: 14,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  railLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    borderRadius: 1,
    backgroundColor: Colors.backgroundSelected,
  },
  railFromMiddle: {
    top: '50%',
  },
  railToMiddle: {
    bottom: '50%',
  },
  node: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2.5,
    backgroundColor: Colors.backgroundElement,
  },
  nodeHalo: {
    boxShadow: '0 0 0 4px rgba(221, 67, 1, 0.15)',
  },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  checkDone: {
    borderColor: Colors.success,
    backgroundColor: Colors.success,
  },
  struck: {
    textDecorationLine: 'line-through',
  },
  vaccineIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});
