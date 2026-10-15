import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  AlertCircle,
  CalendarPlus,
  Check,
  Clock,
  FileText,
  Info,
  type LucideIcon,
} from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Glass } from '@/components/ui/glass';
import { IconTile, type Tone } from '@/components/ui/icon-tile';
import { Chevron, Divided, LIST_LEAD, ListCard, ListRow } from '@/components/ui/list';
import { Section } from '@/components/ui/section';
import { Tag } from '@/components/ui/tag';
import { Colors, Fonts, Glass as GlassTokens, Gradients, Spacing } from '@/constants/theme';
import { DoctorAvatar } from '@/features/doctors/doctor-avatar';
import { istParts } from '@/features/doctors/time';
import { formatShortDate } from '@/features/reminders/schedule';

import { DoseTimeline } from './dose-timeline';
import { type VaccinationRecord } from './types';
import { useVaccinations } from './use-vaccinations';

/** Microsoft Fluent Emoji (MIT), as on Home's Today card; see assets/images/home/3d/LICENSE. */
const SYRINGE = require('@/assets/images/home/3d/syringe.png');

/** A status tag carries an icon as well as its word. */
const TAG_ICONS: Partial<Record<Tone, LucideIcon>> = {
  success: Check,
  warning: Clock,
  danger: AlertCircle,
};

type VaccineDetailProps = {
  vaccination: VaccinationRecord;
  /** Called with the vaccine as saved after a dose is marked. Screens reading the shared list
   * from `useVaccinations` are updated anyway and can leave it out. */
  onChange?: (vaccination: VaccinationRecord) => void;
  /** A family member's vaccine: doses can't be marked from here. */
  readOnly?: boolean;
};

/**
 * A vaccine opened up: its doses on one pane of glass (how far along, then every dose and its
 * status), how it is given, and who prescribed it.
 */
export function VaccineDetail({ vaccination, onChange, readOnly }: VaccineDetailProps) {
  const { markDose } = useVaccinations();
  const TagIcon = TAG_ICONS[vaccination.tag.tone];

  const howGiven = [
    { label: 'Dose', value: vaccination.doseText },
    { label: 'Route', value: vaccination.route },
    { label: 'Where', value: vaccination.site },
  ].filter((row): row is { label: string; value: string } => !!row.value);

  const doctor = vaccination.doctor;
  const prescriptionId = vaccination.prescriptionId;

  return (
    <>
      <View style={styles.dosesBlock}>
        {/* The pane carries its own light: peach in the top right, sky blue in the bottom left. */}
        <Glass style={styles.card}>
          <View style={styles.header}>
            {/* A plain View rounds and clips; the tint is a layer, the art one more above it. */}
            <View style={styles.dish}>
              <LinearGradient
                colors={Gradients.dish}
                start={{ x: 0.2, y: 0 }}
                end={{ x: 0.8, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={[StyleSheet.absoluteFill, styles.center]}>
                <Image source={SYRINGE} style={styles.art} contentFit="contain" aria-hidden />
              </View>
            </View>
            <View style={styles.flex}>
              <ThemedText style={styles.title} numberOfLines={1}>
                {vaccination.givenDoses} of {vaccination.totalDoses}{' '}
                {vaccination.totalDoses === 1 ? 'dose' : 'doses'} given
              </ThemedText>
              <ThemedText style={styles.subtitle} numberOfLines={1}>
                {vaccination.schedule}
              </ThemedText>
            </View>
            <Tag label={vaccination.tag.label} tone={vaccination.tag.tone} icon={TagIcon} />
          </View>
          <View style={styles.rule} />
          <DoseTimeline
            vaccination={vaccination}
            onMark={
              readOnly
                ? undefined
                : async (dose, given, givenOn) =>
                    onChange?.(await markDose(vaccination.id, dose.number, given, givenOn))
            }
          />
        </Glass>

        <View style={styles.note}>
          <Info size={14} color={Colors.textFaint} strokeWidth={2.2} style={styles.noteIcon} />
          <ThemedText style={styles.noteText}>
            {readOnly
              ? 'Doses are marked given by the person themselves, from their own HealthMatrix app.'
              : 'Get each dose at a clinic or hospital, then mark it given here so your reminders stop.'}
          </ThemedText>
        </View>
      </View>

      {howGiven.length || vaccination.instructions ? (
        <Section title="How it’s given" index={1}>
          <Glass style={styles.facts}>
            <Divided inset={0}>
              {howGiven.map(({ label, value }) => (
                <View key={label} style={styles.fact}>
                  <ThemedText style={styles.factLabel}>{label}</ThemedText>
                  <ThemedText style={styles.factValue}>{value}</ThemedText>
                </View>
              ))}
              {vaccination.instructions ? (
                <View style={styles.instructions}>
                  <ThemedText style={styles.factLabel}>Doctor’s instructions</ThemedText>
                  <ThemedText style={styles.instructionsText}>
                    {vaccination.instructions}
                  </ThemedText>
                </View>
              ) : null}
            </Divided>
          </Glass>
        </Section>
      ) : null}

      {doctor || prescriptionId ? (
        <ListCard>
          {doctor ? (
            <ListRow
              leading={<DoctorAvatar name={doctor.name} size={LIST_LEAD} />}
              title={doctor.name}
              subtitle={`Prescribed on ${formatShortDate(istParts(vaccination.prescribedAt).date)} · Reg. ${[
                doctor.registrationNumber,
                doctor.council,
              ]
                .filter(Boolean)
                .join(' · ')}`}
            />
          ) : null}
          {prescriptionId ? (
            <ListRow
              leading={<IconTile icon={FileText} size={LIST_LEAD} />}
              title="View prescription"
              trailing={<Chevron />}
              accessibilityLabel="View prescription"
              onPress={() =>
                router.push({ pathname: '/records/[id]', params: { id: prescriptionId } })
              }
            />
          ) : null}
          {doctor ? (
            <ListRow
              leading={<IconTile icon={CalendarPlus} size={LIST_LEAD} />}
              title="Book a follow-up"
              trailing={<Chevron />}
              accessibilityLabel="Book a follow-up"
              onPress={() =>
                router.push({
                  pathname: '/care/book/[doctorId]',
                  params: { doctorId: doctor.id },
                })
              }
            />
          ) : null}
        </ListCard>
      ) : null}
    </>
  );
}

const DISH = LIST_LEAD;

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    minWidth: 0,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dosesBlock: {
    gap: Spacing.three - 4,
  },
  card: {
    paddingHorizontal: Spacing.three - 2,
    paddingTop: Spacing.three - 2,
    paddingBottom: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
  },
  // A round of glass, like the shared `Dish`: a bright rim and the faint edge line.
  dish: {
    width: DISH,
    height: DISH,
    borderRadius: DISH / 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: GlassTokens.rim,
    boxShadow: GlassTokens.shadowFlat,
  },
  art: {
    width: 23,
    height: 23,
  },
  title: {
    fontFamily: Fonts.displaySemibold,
    fontSize: 17,
    lineHeight: 22,
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
  // A hairline across the whole card, between how far along and the doses.
  rule: {
    height: StyleSheet.hairlineWidth,
    marginTop: Spacing.three - 4,
    marginBottom: Spacing.three - 2,
    marginHorizontal: -(Spacing.three - 2),
    backgroundColor: GlassTokens.hairline,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingHorizontal: Spacing.one,
  },
  noteIcon: {
    marginTop: 2,
  },
  noteText: {
    flex: 1,
    fontFamily: Fonts.medium,
    fontSize: 12.5,
    lineHeight: 17,
    color: Colors.textFaint,
  },
  facts: {
    paddingHorizontal: Spacing.three - 2,
    paddingVertical: Spacing.one,
  },
  // A label on the left, its value on the right, like a spec sheet.
  fact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    minHeight: 48,
    paddingVertical: Spacing.two + 2,
  },
  factLabel: {
    fontFamily: Fonts.medium,
    fontSize: 13.5,
    lineHeight: 18,
    color: Colors.textSoft,
  },
  factValue: {
    flexShrink: 1,
    textAlign: 'right',
    fontFamily: Fonts.bold,
    fontSize: 14.5,
    lineHeight: 19,
    color: Colors.text,
  },
  instructions: {
    gap: 3,
    paddingVertical: Spacing.three - 4,
  },
  instructionsText: {
    fontFamily: Fonts.medium,
    fontSize: 14.5,
    lineHeight: 21,
    color: Colors.text,
  },
});
