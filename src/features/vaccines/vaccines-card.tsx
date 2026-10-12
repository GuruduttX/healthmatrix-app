import { router } from 'expo-router';
import { CircleCheck, Syringe } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconTile } from '@/components/ui/icon-tile';
import { SectionHeader } from '@/components/ui/section-header';
import { Surface } from '@/components/ui/surface';
import { Tag } from '@/components/ui/tag';
import { Colors, Fonts, Radius, Shadows, Spacing } from '@/constants/theme';
import { istToday } from '@/features/doctors/time';

import { askGivenDay } from './dose-timeline';
import { type VaccinationRecord } from './types';
import { useVaccinations } from './use-vaccinations';

const vaccineTitle = (name: string) => (/vaccin/i.test(name) ? name : `${name} vaccine`);

/**
 * "Vaccines" on the Care tab: each vaccine with doses left, its next dose, and Mark given when
 * that dose is due. Finished courses fold into one line. Hidden when there are no vaccines.
 */
export function VaccinesCard() {
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
    <View style={styles.section}>
      <SectionHeader title="Vaccines" />
      <Surface style={styles.card}>
        {open.map((vaccination, index) => {
          const next = vaccination.doses.find((d) => d.status !== 'given')!;
          const canMark = next.status === 'due' || next.status === 'overdue';
          return (
            <View key={vaccination.id} style={[styles.row, index > 0 && styles.divider]}>
              <Pressable
                onPress={() =>
                  router.push({ pathname: '/care/vaccine/[id]', params: { id: vaccination.id } })
                }
                accessibilityRole="button"
                accessibilityHint="Opens the vaccine record"
                style={({ pressed }) => [styles.main, pressed && styles.pressed]}>
                <IconTile
                  icon={Syringe}
                  tone={next.status === 'overdue' ? 'danger' : 'primary'}
                  size={40}
                />
                <View style={styles.flex}>
                  <ThemedText type="smallBold" numberOfLines={1}>
                    {vaccineTitle(vaccination.name)}
                  </ThemedText>
                  <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
                    {vaccination.givenDoses} of {vaccination.totalDoses} given
                    {vaccination.doseText ? ` · ${vaccination.doseText}` : ''}
                  </ThemedText>
                  <View style={styles.tag}>
                    <Tag label={vaccination.tag.label} tone={vaccination.tag.tone} />
                  </View>
                </View>
              </Pressable>

              {busy === vaccination.id ? (
                <ActivityIndicator color={Colors.textSecondary} />
              ) : canMark ? (
                <Pressable
                  onPress={() => markNext(vaccination)}
                  accessibilityRole="button"
                  accessibilityLabel={`Mark ${vaccination.name} dose ${next.number} given`}
                  hitSlop={6}
                  style={({ pressed }) => [styles.mark, pressed && styles.pressed]}>
                  <ThemedText type="caption" themeColor="onInk" style={styles.bold}>
                    Mark given
                  </ThemedText>
                </Pressable>
              ) : null}
            </View>
          );
        })}

        {finished ? (
          <View style={[styles.finished, open.length > 0 && styles.divider]}>
            <CircleCheck size={16} color={Colors.success} strokeWidth={2.2} />
            <ThemedText type="caption" themeColor="textSecondary">
              {finished === 1 ? '1 vaccine' : `${finished} vaccines`} fully given. See them in
              Records.
            </ThemedText>
          </View>
        ) : null}

        {error ? (
          <ThemedText type="caption" themeColor="danger" style={styles.error}>
            {error}
          </ThemedText>
        ) : null}
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two + 2,
  },
  card: {
    paddingVertical: Spacing.one,
  },
  flex: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  main: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 4,
    paddingVertical: 12,
  },
  tag: {
    marginTop: 4,
  },
  mark: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primary,
    boxShadow: Shadows.glow,
  },
  bold: {
    fontFamily: Fonts.bold,
  },
  finished: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: 12,
  },
  error: {
    paddingBottom: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});
