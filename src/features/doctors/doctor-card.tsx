import { BadgeCheck, CalendarPlus, ShieldCheck } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Surface } from '@/components/ui/surface';
import { Tag } from '@/components/ui/tag';
import { Colors, Fonts, Spacing } from '@/constants/theme';

import { DoctorAvatar } from './doctor-avatar';
import { specialtyLabel } from './specialties';
import { formatSlot } from './time';
import { type Doctor, type Specialty } from './types';

type DoctorCardProps = {
  doctor: Doctor;
  /** The specialty being browsed; shown first and highlighted. */
  specialty?: Specialty;
  onBook: () => void;
};

/**
 * A doctor in the list, as one pane of glass: their photo and name, what they've done in one quiet
 * line, their registration, then their next free slot beside the one action, Book.
 */
export function DoctorCard({ doctor, specialty, onBook }: DoctorCardProps) {
  const specialties = [...doctor.specialties].sort(
    (a, b) => Number(b === specialty) - Number(a === specialty),
  );
  const registration = [doctor.registrationNumber, doctor.council].filter(Boolean).join(' · ');
  const facts = [
    doctor.experienceYears
      ? `${doctor.experienceYears} ${doctor.experienceYears === 1 ? 'year' : 'years'}`
      : null,
    doctor.languages.length ? doctor.languages.join(', ') : null,
    doctor.location,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Surface style={styles.card}>
      <View style={styles.header}>
        <DoctorAvatar name={doctor.name} photoUrl={doctor.photoUrl} size={52} />
        <View style={styles.flex}>
          <View style={styles.nameRow}>
            <ThemedText numberOfLines={1} style={styles.name}>
              {doctor.name}
            </ThemedText>
            <BadgeCheck
              size={16}
              color={Colors.good}
              strokeWidth={2.4}
              accessibilityLabel="Verified"
            />
          </View>
          {doctor.qualifications ? (
            <ThemedText style={styles.line} numberOfLines={1}>
              {doctor.qualifications}
            </ThemedText>
          ) : null}
          {facts ? (
            <ThemedText style={styles.facts} numberOfLines={2}>
              {facts}
            </ThemedText>
          ) : null}
        </View>
      </View>

      {/* On a specialty's own page its name is the title; tags only say what else they see. */}
      {specialties.length > 1 ? (
        <View style={styles.tags}>
          {specialties.map((id) => (
            <Tag key={id} label={specialtyLabel(id)} tone={id === specialty ? 'primary' : 'neutral'} />
          ))}
        </View>
      ) : null}

      {registration ? (
        <View style={styles.registration}>
          <ShieldCheck size={13} color={Colors.textFaint} strokeWidth={2.2} />
          <ThemedText style={[styles.flex, styles.registrationText]} numberOfLines={1}>
            Reg. {registration}
          </ThemedText>
        </View>
      ) : null}

      <View style={styles.rule} />

      <View style={styles.footer}>
        <View style={styles.flex}>
          <ThemedText style={styles.caption} numberOfLines={1}>
            Next available · {doctor.slotMinutes} min video
          </ThemedText>
          <ThemedText
            style={[styles.next, !doctor.nextSlot && styles.nextNone]}
            numberOfLines={1}>
            {doctor.nextSlot
              ? formatSlot(doctor.nextSlot)
              : `None in the next ${doctor.bookingWindowDays} ${doctor.bookingWindowDays === 1 ? 'day' : 'days'}`}
          </ThemedText>
        </View>
        <Button
          label="Book"
          icon={CalendarPlus}
          size="sm"
          shadow={false}
          onPress={onBook}
          accessibilityLabel={`Book an appointment with ${doctor.name}`}
        />
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three - 4,
    paddingVertical: 14,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  name: {
    flexShrink: 1,
    fontFamily: Fonts.displaySemibold,
    fontSize: 17.5,
    lineHeight: 22,
    letterSpacing: -0.3,
    color: Colors.text,
  },
  line: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSoft,
  },
  facts: {
    marginTop: 1,
    fontFamily: Fonts.medium,
    fontSize: 12.5,
    lineHeight: 17,
    color: Colors.textFaint,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  registration: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  registrationText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textFaint,
  },
  // A hairline across the whole card, above the booking line.
  rule: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: -Spacing.three,
    backgroundColor: Colors.hairline,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
  },
  caption: {
    fontFamily: Fonts.semibold,
    fontSize: 12.5,
    lineHeight: 17,
    color: Colors.textFaint,
  },
  next: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    lineHeight: 20,
    color: Colors.text,
  },
  nextNone: {
    fontFamily: Fonts.semibold,
    color: Colors.textSoft,
  },
});
