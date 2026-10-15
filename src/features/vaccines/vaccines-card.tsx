import { router } from 'expo-router';
import {
  AlertCircle,
  Check,
  CircleCheck,
  Clock,
  type LucideIcon,
} from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ArtDish } from '@/components/ui/dish';
import { IconTile, type Tone } from '@/components/ui/icon-tile';
import { Chevron, LIST_LEAD, ListCard, ListRow, listText } from '@/components/ui/list';
import { Section } from '@/components/ui/section';
import { Tag } from '@/components/ui/tag';
import { Colors, Fonts, Glass, Radius, Spacing } from '@/constants/theme';
import { istToday } from '@/features/doctors/time';

import { askGivenDay } from './dose-timeline';
import { type VaccinationRecord } from './types';
import { useVaccinations } from './use-vaccinations';

const vaccineTitle = (name: string) => (/vaccin/i.test(name) ? name : `${name} vaccine`);

/** Microsoft Fluent Emoji (MIT), as on Home's Today card; see assets/images/home/3d/LICENSE. */
const SYRINGE = require('@/assets/images/home/3d/syringe.png');

/** A status tag carries an icon as well as its word. */
const TAG_ICONS: Partial<Record<Tone, LucideIcon>> = {
  success: Check,
  warning: Clock,
  danger: AlertCircle,
};

/**
 * "Vaccines" on the Care tab: each vaccine with doses left, its next dose, and a tick to mark it
 * given when that dose is due. Finished courses fold into one line. Hidden when there are no
 * vaccines. `index` is its place on the page, for the section's ease-in.
 */
export function VaccinesCard({ index }: { index?: number }) {
  const { vaccinations, markDose } = useVaccinations();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!vaccinations?.length) return null;

  const open = vaccinations.filter((v) => v.givenDoses < v.totalDoses);
  const finished = vaccinations.length - open.length;
  const today = istToday();

  const markNext = async (vaccination: VaccinationRecord) => {
    const dose = vaccination.doses.find((d) => d.status !== 'given');
    if (!dose) return;
    const day = await askGivenDay(vaccination.name, dose, today);
    if (!day) return;
    setBusy(vaccination.id);
    setError(null);
    try {
      await markDose(vaccination.id, dose.number, true, day);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save that. Try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Section title="Vaccines" index={index}>
      <ListCard>
        {open.map((vaccination) => {
          const next = vaccination.doses.find((d) => d.status !== 'given')!;
          const canMark = next.status === 'due' || next.status === 'overdue';
          const { label, tone } = vaccination.tag;
          return (
            // The words open the record; the tick beside them is its own button.
            <View key={vaccination.id} style={styles.row}>
              <Pressable
                onPress={() =>
                  router.push({ pathname: '/care/vaccine/[id]', params: { id: vaccination.id } })
                }
                accessibilityRole="button"
                accessibilityHint="Opens the vaccine record"
                style={({ pressed }) => [styles.main, pressed && styles.pressed]}>
                <ArtDish art={SYRINGE} />
                <View style={styles.flex}>
                  <ThemedText style={listText.title} numberOfLines={1}>
                    {vaccineTitle(vaccination.name)}
                  </ThemedText>
                  <ThemedText style={listText.subtitle} numberOfLines={1}>
                    {vaccination.givenDoses} of {vaccination.totalDoses} given
                    {vaccination.doseText ? ` · ${vaccination.doseText}` : ''}
                  </ThemedText>
                  <View style={styles.tag}>
                    <Tag label={label} tone={tone} icon={TAG_ICONS[tone]} />
                  </View>
                </View>
                {canMark ? null : <Chevron />}
              </Pressable>

              {busy === vaccination.id ? (
                <View style={styles.tick}>
                  <ActivityIndicator size="small" color={Colors.primaryDeep} />
                </View>
              ) : canMark ? (
                // Like Home's tick for a dose: glass with a peach ring, waiting to be ticked.
                <Pressable
                  onPress={() => markNext(vaccination)}
                  accessibilityRole="button"
                  accessibilityLabel={`Mark ${vaccination.name} dose ${next.number} given`}
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.tick,
                    styles.tickButton,
                    pressed && styles.tickPressed,
                  ]}>
                  <Check size={16} color={Colors.primaryDeep} strokeWidth={3} />
                </Pressable>
              ) : null}
            </View>
          );
        })}

        {finished ? (
          <ListRow
            leading={<IconTile icon={CircleCheck} tone="success" size={LIST_LEAD} />}
            title={finished === 1 ? '1 vaccine fully given' : `${finished} vaccines fully given`}
            subtitle="See them in Records."
          />
        ) : null}

        {error ? (
          <View style={styles.error} accessibilityRole="alert">
            <AlertCircle size={15} color={Colors.high} strokeWidth={2.4} />
            <ThemedText style={styles.errorText}>{error}</ThemedText>
          </View>
        ) : null}
      </ListCard>
    </Section>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    minWidth: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
  },
  main: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
    minHeight: 56,
    paddingVertical: Spacing.two + 3,
  },
  pressed: {
    opacity: 0.6,
  },
  tag: {
    flexDirection: 'row',
    marginTop: 5,
  },
  tick: {
    width: 34,
    height: 34,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tickButton: {
    borderWidth: 1.5,
    borderColor: Colors.primaryLight,
    backgroundColor: Glass.fillSoft,
    boxShadow: Glass.glowSmall,
  },
  tickPressed: {
    backgroundColor: Colors.primaryTintStrong,
    transform: [{ scale: 0.97 }],
  },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing.two + 2,
  },
  errorText: {
    flex: 1,
    fontFamily: Fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.high,
  },
});
