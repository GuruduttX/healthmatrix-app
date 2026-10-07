import { router } from 'expo-router';
import {
  CalendarPlus,
  Droplet,
  FileText,
  Info,
  MapPin,
  MoveDown,
  Syringe,
  type LucideIcon,
} from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { IconTile } from '@/components/ui/icon-tile';
import { Surface } from '@/components/ui/surface';
import { Tag } from '@/components/ui/tag';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { DoctorAvatar } from '@/features/doctors/doctor-avatar';
import { istParts } from '@/features/doctors/time';
import { formatShortDate } from '@/features/reminders/schedule';

import { DoseTimeline } from './dose-timeline';
import { type VaccinationRecord } from './types';
import { useVaccinations } from './use-vaccinations';

type VaccineDetailProps = {
  vaccination: VaccinationRecord;
  /** Called with the vaccine as saved after a dose is marked. Screens reading the shared list
   * from `useVaccinations` are updated anyway and can leave it out. */
  onChange?: (vaccination: VaccinationRecord) => void;
};

/** A vaccine opened up: how it is given, every dose and its status, and who prescribed it. */
export function VaccineDetail({ vaccination, onChange }: VaccineDetailProps) {
  const { markDose } = useVaccinations();
  const done = vaccination.givenDoses === vaccination.totalDoses;
  const progress = vaccination.totalDoses ? vaccination.givenDoses / vaccination.totalDoses : 0;

  const howGiven: { icon: LucideIcon; label: string; value?: string }[] = [
    { icon: Droplet, label: 'Dose', value: vaccination.doseText },
    { icon: MoveDown, label: 'Route', value: vaccination.route },
    { icon: MapPin, label: 'Where', value: vaccination.site },
  ];

  return (
    <>
      <Surface style={styles.hero}>
        <View style={styles.heroTop}>
          <IconTile icon={Syringe} tone={done ? 'success' : 'primary'} size={48} />
          <View style={styles.flex}>
            <ThemedText type="caption" themeColor="textSecondary">
              {vaccination.schedule}
            </ThemedText>
            <ThemedText type="bodyBold">
              {vaccination.givenDoses} of {vaccination.totalDoses}{' '}
              {vaccination.totalDoses === 1 ? 'dose' : 'doses'} given
            </ThemedText>
          </View>
          <Tag label={vaccination.tag.label} tone={vaccination.tag.tone} />
        </View>
        <View style={styles.bar}>
          <View style={[styles.barFill, { width: `${progress * 100}%` }]} />
        </View>
      </Surface>

      {howGiven.some((row) => row.value) ? (
        <Surface style={styles.facts}>
          {howGiven
            .filter((row) => row.value)
            .map(({ icon: Icon, label, value }) => (
              <View key={label} style={styles.fact}>
                <Icon size={16} color={Colors.textSecondary} strokeWidth={2.2} />
                <ThemedText type="small" themeColor="textSecondary" style={styles.factLabel}>
                  {label}
                </ThemedText>
                <ThemedText type="smallBold" style={styles.flex}>
                  {value}
                </ThemedText>
              </View>
            ))}
        </Surface>
      ) : null}

      {vaccination.instructions ? (
        <View style={styles.instructions}>
          <ThemedText type="caption" themeColor="primary" style={styles.bold}>
            Doctor’s instructions
          </ThemedText>
          <ThemedText style={styles.instructionsText}>{vaccination.instructions}</ThemedText>
        </View>
      ) : null}

      <View style={styles.section}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          Doses
        </ThemedText>
        <Surface style={styles.doses}>
          <DoseTimeline
            vaccination={vaccination}
            onMark={async (dose, given, givenOn) =>
              onChange?.(await markDose(vaccination.id, dose.number, given, givenOn))
            }
          />
        </Surface>
      </View>

      <View style={styles.note}>
        <Info size={15} color={Colors.textSecondary} strokeWidth={2.2} />
        <ThemedText type="caption" themeColor="textSecondary" style={styles.flex}>
          Get each dose at a clinic or hospital, then mark it given here so your reminders stop.
        </ThemedText>
      </View>

      {vaccination.doctor ? (
        <Surface style={styles.doctor}>
          <DoctorAvatar name={vaccination.doctor.name} size={44} />
          <View style={styles.flex}>
            <ThemedText type="caption" themeColor="textSecondary">
              Prescribed on {formatShortDate(istParts(vaccination.prescribedAt).date)} by
            </ThemedText>
            <ThemedText type="smallBold">{vaccination.doctor.name}</ThemedText>
            <ThemedText type="caption" themeColor="textMuted">
              Reg.{' '}
              {[vaccination.doctor.registrationNumber, vaccination.doctor.council]
                .filter(Boolean)
                .join(' · ')}
            </ThemedText>
          </View>
        </Surface>
      ) : null}

      <View style={styles.actions}>
        {vaccination.prescriptionId ? (
          <Button
            label="View prescription"
            variant="secondary"
            icon={FileText}
            onPress={() =>
              router.push({
                pathname: '/records/[id]',
                params: { id: vaccination.prescriptionId! },
              })
            }
          />
        ) : null}
        {vaccination.doctor ? (
          <Button
            label="Book a follow-up"
            variant="secondary"
            icon={CalendarPlus}
            onPress={() =>
              router.push({
                pathname: '/care/book/[doctorId]',
                params: { doctorId: vaccination.doctor!.id },
              })
            }
          />
        ) : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  bold: {
    fontFamily: Fonts.bold,
  },
  hero: {
    gap: Spacing.two + 4,
    marginTop: Spacing.one,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 4,
  },
  bar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: Colors.backgroundSelected,
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: Colors.success,
  },
  facts: {
    gap: Spacing.two + 2,
  },
  fact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  factLabel: {
    width: 56,
  },
  instructions: {
    gap: 4,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.primarySoft,
  },
  instructionsText: {
    fontFamily: Fonts.medium,
    fontSize: 15,
    lineHeight: 22,
  },
  section: {
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  doses: {
    padding: Spacing.three,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  doctor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 4,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
