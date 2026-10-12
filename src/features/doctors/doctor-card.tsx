import {
  BadgeCheck,
  BriefcaseMedical,
  CalendarPlus,
  Languages,
  MapPin,
  ShieldCheck,
  Video,
  type LucideIcon,
} from 'lucide-react-native';
import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Surface } from '@/components/ui/surface';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

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

/** A doctor in the list: who they are, their registration, and their next free slot. */
export function DoctorCard({ doctor, specialty, onBook }: DoctorCardProps) {
  const specialties = [...doctor.specialties].sort(
    (a, b) => Number(b === specialty) - Number(a === specialty),
  );
  const registration = [doctor.registrationNumber, doctor.council].filter(Boolean).join(' · ');

  return (
    <Surface style={styles.card}>
      <View style={styles.header}>
        <DoctorAvatar name={doctor.name} photoUrl={doctor.photoUrl} size={56} />
        <View style={styles.flex}>
          <View style={styles.nameRow}>
            <ThemedText numberOfLines={2} style={styles.name}>
              {doctor.name}
            </ThemedText>
            <BadgeCheck size={17} color={Colors.success} strokeWidth={2.2} />
          </View>
          {doctor.qualifications ? (
            <ThemedText type="caption" themeColor="textSecondary">
              {doctor.qualifications}
            </ThemedText>
          ) : null}
          <View style={styles.tags}>
            {specialties.map((id) => (
              <View key={id} style={[styles.tag, id === specialty && styles.tagActive]}>
                <ThemedText style={[styles.tagText, id === specialty && styles.tagTextActive]}>
                  {specialtyLabel(id)}
                </ThemedText>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.facts}>
        {doctor.experienceYears ? (
          <Fact icon={BriefcaseMedical}>
            {doctor.experienceYears} {doctor.experienceYears === 1 ? 'year' : 'years'}
          </Fact>
        ) : null}
        {doctor.languages.length ? <Fact icon={Languages}>{doctor.languages.join(', ')}</Fact> : null}
        {doctor.location ? <Fact icon={MapPin}>{doctor.location}</Fact> : null}
        <Fact icon={Video}>{doctor.slotMinutes} min video</Fact>
      </View>

      <View style={styles.registration}>
        <ShieldCheck size={13} color={Colors.textMuted} strokeWidth={2.2} />
        <ThemedText type="caption" themeColor="textMuted" style={styles.flex} numberOfLines={1}>
          Reg. {registration}
        </ThemedText>
      </View>

      <View style={[styles.footer, !doctor.nextSlot && styles.footerNone]}>
        <View style={styles.flex}>
          <ThemedText type="caption" themeColor="textSecondary">
            Next available
          </ThemedText>
          <ThemedText type="smallBold" themeColor={doctor.nextSlot ? 'success' : 'textMuted'}>
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

function Fact({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <View style={styles.fact}>
      <Icon size={13} color={Colors.inkMid} strokeWidth={2.3} />
      <ThemedText type="caption" style={styles.factText} numberOfLines={1}>
        {children}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three - 2,
    borderRadius: Radius.xl,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three - 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    flexShrink: 1,
    fontFamily: Fonts.display,
    fontSize: 17,
    lineHeight: 22,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  tag: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: Radius.pill,
    backgroundColor: Colors.backgroundSelected,
  },
  tagActive: {
    backgroundColor: Colors.primarySoft,
  },
  tagText: {
    fontFamily: Fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    color: Colors.inkMid,
  },
  tagTextActive: {
    color: Colors.primary,
  },
  facts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  fact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    maxWidth: '100%',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  factText: {
    flexShrink: 1,
    fontFamily: Fonts.semibold,
    color: Colors.inkMid,
  },
  registration: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: -4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
    paddingVertical: 10,
    paddingLeft: 14,
    paddingRight: 10,
    borderRadius: Radius.lg,
    backgroundColor: Colors.successSoft,
  },
  footerNone: {
    backgroundColor: Colors.background,
  },
});
