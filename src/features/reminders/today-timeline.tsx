import { router } from 'expo-router';
import { AlertCircle, CircleCheck, Plus } from 'lucide-react-native';
import { Fragment, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Glass, glassSurface } from '@/components/ui/glass';
import { IconTile } from '@/components/ui/icon-tile';
import { Chevron, Divided } from '@/components/ui/list';
import { Skeleton, SkeletonCircle, SkeletonGroup } from '@/components/ui/skeleton';
import { Colors, Fonts, Glass as GlassTokens, Spacing } from '@/constants/theme';
import { type VaccinationRecord, type VaccineDose } from '@/features/vaccines/types';

import { doseState, type DoseState } from './dose-item';
import { DoseRing, LEAD, MedicineDish, TickButton, type TickLook } from './dose-ui';
import { describeDose, formatTime, type Dose } from './schedule';

// Today's doses as one card, shared with the Care tab's "Medicines today", built like Home's
// Today card: a compact header that opens every medicine, then a line per dose with its tick.
// Also the card's loading, empty and nothing-due states.

const vaccineTitle = (name: string) => (/vaccin/i.test(name) ? name : `${name} vaccine`);

const openMedicines = () => router.push('/care/medicines');

/** The word at the start of a dose's quiet line, in its flag's colour. */
const FLAGS: Partial<Record<DoseState, { text: string; color: string }>> = {
  taken: { text: 'Taken', color: Colors.good },
  skipped: { text: 'Skipped', color: Colors.textFaint },
  due: { text: 'Due now', color: Colors.primaryDeep },
  missed: { text: 'Not marked', color: Colors.watch },
};

/** "2 doses left today", "3 doses, 1 vaccine left", or how the day went: one line on a phone. */
function headline(total: number, taken: number, dosesLeft: number, vaccinesDue: number) {
  const parts = [
    dosesLeft ? `${dosesLeft} ${dosesLeft === 1 ? 'dose' : 'doses'}` : null,
    vaccinesDue ? `${vaccinesDue} ${vaccinesDue === 1 ? 'vaccine' : 'vaccines'}` : null,
  ].filter(Boolean);
  if (parts.length === 2) return `${parts.join(', ')} left`;
  if (dosesLeft) return `${parts[0]} left today`;
  if (vaccinesDue) return `${parts[0]} due`;
  return taken === total ? 'Every dose taken today' : 'Today’s doses are done';
}

/** A pane of glass, as on Home. */
function Card({ children }: { children: ReactNode }) {
  return <Glass style={styles.card}>{children}</Glass>;
}

/** The card's top, one line, opening every medicine and reminder. */
function Header({
  leading,
  title,
  more,
  accessibilityLabel,
}: {
  leading: ReactNode;
  title: string;
  /** "2 more": doses that did not make the card. */
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

const tickLook = (state: DoseState): TickLook =>
  state === 'taken' ? 'done' : state === 'due' ? 'solid' : 'soft';

/** A dose's line. The whole line is the checkbox: tap it to tick the dose off, or back. */
function DoseRow({ dose, state, onToggle }: { dose: Dose; state: DoseState; onToggle: () => void }) {
  const done = dose.status === 'taken';
  const flag = FLAGS[state];
  // "Due now" already says when; every other line needs its time.
  const detail = [state === 'due' ? null : formatTime(dose.time), describeDose(dose.reminder)]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={`${dose.reminder.name}, ${formatTime(dose.time)}${flag ? `, ${flag.text}` : ''}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <MedicineDish faded={!!dose.status} />
      <View style={styles.flex}>
        <ThemedText
          numberOfLines={1}
          style={[
            styles.rowTitle,
            !!dose.status && styles.rowTitleMarked,
            dose.status === 'skipped' && styles.struck,
          ]}>
          {dose.reminder.name}
        </ThemedText>
        <ThemedText style={styles.rowSubtitle} numberOfLines={1}>
          {flag ? (
            <ThemedText style={[styles.flag, { color: flag.color }]}>
              {flag.text}
              {detail ? ' · ' : ''}
            </ThemedText>
          ) : null}
          {detail}
        </ThemedText>
      </View>
      <TickButton look={tickLook(state)} />
    </Pressable>
  );
}

function VaccineRow({ vaccination, dose }: VaccineDue) {
  const overdue = dose.status === 'overdue';
  const detail = [`Dose ${dose.number} of ${vaccination.totalDoses}`, vaccination.doseText]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/care/vaccine/[id]', params: { id: vaccination.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${vaccineTitle(vaccination.name)}, dose ${dose.number} ${overdue ? 'overdue' : 'due'}`}
      accessibilityHint="Opens the vaccine record"
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <MedicineDish art="syringe" />
      <View style={styles.flex}>
        <ThemedText style={styles.rowTitle} numberOfLines={1}>
          {vaccineTitle(vaccination.name)}
        </ThemedText>
        <ThemedText style={styles.rowSubtitle} numberOfLines={1}>
          <ThemedText style={[styles.flag, { color: overdue ? Colors.high : Colors.primaryDeep }]}>
            {overdue ? 'Overdue' : 'Due'} ·{' '}
          </ThemedText>
          {detail}
        </ThemedText>
      </View>
      <Chevron />
    </Pressable>
  );
}

/** Before any medicine is added: what the card will do, and the way to start. */
export function NoMedicinesCard() {
  return (
    <Card>
      <View style={styles.header}>
        <MedicineDish />
        <View style={styles.flex}>
          <ThemedText style={styles.title} accessibilityRole="header">
            Never miss a dose
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Add your medicines and we’ll remind you at the right time.
          </ThemedText>
        </View>
        <Pressable
          onPress={() => router.push('/care/medicine/new')}
          accessibilityRole="button"
          accessibilityLabel="Add medicine"
          hitSlop={6}
          style={({ pressed }) => [
            glassSurface.small,
            styles.addIcon,
            pressed && styles.addIconPressed,
          ]}>
          <Plus size={18} color={Colors.primaryDeep} strokeWidth={2.4} />
        </Pressable>
      </View>
    </Card>
  );
}

/** The medicines card's shape while it loads: the header, then three dose lines. */
export function MedicinesSkeleton() {
  return (
    <Card>
      <SkeletonGroup label="Loading today’s medicines">
        <View style={styles.header}>
          <SkeletonCircle size={LEAD} />
          <View style={styles.flex}>
            <Skeleton width="55%" height={15} />
          </View>
        </View>
        <View style={styles.rule} />
        {[0, 1, 2].map((i) => (
          <Fragment key={i}>
            {i ? <View style={styles.divider} /> : null}
            <View style={styles.row}>
              <SkeletonCircle size={LEAD} />
              <View style={[styles.flex, styles.skeletonText]}>
                <Skeleton width={i === 1 ? '45%' : '58%'} height={13} />
                <Skeleton width={i === 1 ? '66%' : '50%'} height={10} />
              </View>
              <SkeletonCircle size={LEAD} />
            </View>
          </Fragment>
        ))}
      </SkeletonGroup>
    </Card>
  );
}

/** A vaccine dose that is due or overdue, shown after the doses. */
export type VaccineDue = { vaccination: VaccinationRecord; dose: VaccineDose };

/** Nothing scheduled today, with a way to the medicines screen. */
export function NothingDueCard({ includesVaccines = false }: { includesVaccines?: boolean }) {
  return (
    <Pressable
      onPress={openMedicines}
      accessibilityRole="button"
      accessibilityHint="Manage medicines"
      style={({ pressed }) => pressed && styles.cardPressed}>
      <Card>
        <View style={styles.header}>
          <IconTile icon={CircleCheck} tone="success" size={LEAD} />
          <View style={styles.flex}>
            <ThemedText style={styles.title}>Nothing due today</ThemedText>
            <ThemedText style={styles.subtitle}>
              {includesVaccines
                ? 'No medicines or vaccines scheduled. Enjoy your day.'
                : 'No medicines scheduled today. Enjoy your day.'}
            </ThemedText>
          </View>
          <Chevron />
        </View>
      </Card>
    </Pressable>
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
 * Today's doses on one card: how the day is going in a line (which opens every medicine), then a
 * line per dose to tick off, then any vaccine that is due.
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
  const left = doses.filter((dose) => !dose.status).length;
  const title = doses.length
    ? headline(doses.length, taken, left, vaccinesDue.length)
    : vaccinesDue.length === 1
      ? 'Vaccine due'
      : 'Vaccines due';
  const more = doses.length > shown.length ? `${doses.length - shown.length} more` : undefined;
  const progress = doses.length ? `${taken} of ${doses.length} doses taken. ` : '';

  return (
    <Card>
      <Header
        leading={
          doses.length ? (
            <DoseRing taken={taken} total={doses.length} />
          ) : (
            <MedicineDish art="syringe" />
          )
        }
        title={title}
        more={more}
        accessibilityLabel={`${title}. ${progress}${more ? `${more}. ` : ''}Opens all medicines and reminders.`}
      />

      {shown.length || vaccinesDue.length ? (
        <>
          <View style={styles.rule} />
          <View style={styles.lines}>
            <Divided inset={LEAD}>
              {shown.map((dose) => (
                <DoseRow
                  key={`${dose.reminder.id}-${dose.time}`}
                  dose={dose}
                  state={doseState(dose, now, today)}
                  onToggle={() => onToggle(dose)}
                />
              ))}
              {vaccinesDue.map((due) => (
                <VaccineRow key={due.vaccination.id} {...due} />
              ))}
            </Divided>
          </View>
        </>
      ) : null}

      {markError ? (
        <View style={styles.error} accessibilityLiveRegion="polite">
          <AlertCircle size={15} color={Colors.high} strokeWidth={2.4} />
          <ThemedText style={styles.errorText}>{markError}</ThemedText>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  pressed: {
    opacity: 0.6,
  },
  card: {
    paddingHorizontal: Spacing.three - 2,
    paddingVertical: Spacing.three - 4,
  },
  cardPressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.85,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
  },
  title: {
    fontFamily: Fonts.displaySemibold,
    fontSize: 16.5,
    lineHeight: 21,
    letterSpacing: -0.3,
    color: Colors.text,
  },
  subtitle: {
    marginTop: 1,
    fontFamily: Fonts.medium,
    fontSize: 13,
    lineHeight: 17,
    color: Colors.textSoft,
  },
  more: {
    marginRight: -6,
    fontFamily: Fonts.semibold,
    fontSize: 12.5,
    lineHeight: 16,
    color: Colors.textFaint,
  },
  // Lines
  rule: {
    height: StyleSheet.hairlineWidth,
    marginTop: Spacing.two + 2,
    marginHorizontal: -(Spacing.three - 2),
    backgroundColor: GlassTokens.hairline,
  },
  // The last line's own padding is most of the card's bottom edge.
  lines: {
    marginBottom: -5,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: LEAD + Spacing.three - 4,
    backgroundColor: GlassTokens.hairline,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
    paddingVertical: 7,
  },
  rowTitle: {
    fontFamily: Fonts.bold,
    fontSize: 14.5,
    lineHeight: 18.5,
    color: Colors.text,
  },
  rowTitleMarked: {
    color: Colors.textSoft,
  },
  struck: {
    textDecorationLine: 'line-through',
  },
  rowSubtitle: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textSoft,
  },
  // Nested in the subtitle, so it sets its own line height (ThemedText's default is 24).
  flag: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    lineHeight: 16,
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
  // A round of glass with an orange plus, as on Home.
  addIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIconPressed: {
    backgroundColor: Colors.primaryTint,
    transform: [{ scale: 0.95 }],
  },
  skeletonText: {
    gap: 8,
  },
});
