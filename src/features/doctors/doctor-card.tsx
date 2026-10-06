import {
  BadgeCheck,
  CalendarPlus,
  Languages,
  MapPin,
  ShieldCheck,
  Video,
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
        <DoctorAvatar name={doctor.name} photoUrl={doctor.photoUrl} size={60} />
        <View style={styles.flex}>
          <View style={styles.nameRow}>
            <ThemedText type="bodyBold" numberOfLines={2} style={styles.name}>
              {doctor.name}
            </ThemedText>
            <BadgeCheck size={17} color={Colors.success} strokeWidth={2.2} />
          </View>
          {doctor.qualifications ? (
            <ThemedText type="small" themeColor="textSecondary">
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
        {doctor.languages.length ? (
          <Fact icon={<Languages size={15} color={Colors.textSecondary} strokeWidth={2.2} />}>
            Speaks {doctor.languages.join(', ')}
          </Fact>
        ) : null}
        {doctor.location ? (
          <Fact icon={<MapPin size={15} color={Colors.textSecondary} strokeWidth={2.2} />}>
            {doctor.location}
          </Fact>
        ) : null}
        <Fact icon={<ShieldCheck size={15} color={Colors.textSecondary} strokeWidth={2.2} />}>
          Reg. {registration}
        </Fact>
        <Fact icon={<Video size={15} color={Colors.textSecondary} strokeWidth={2.2} />}>
          Video consult, 30 minutes
        </Fact>
      </View>

      <View style={styles.footer}>
        <View style={styles.flex}>
          <ThemedText type="caption" themeColor="textSecondary">
            Next available
          </ThemedText>
          <ThemedText type="smallBold" themeColor={doctor.nextSlot ? 'success' : 'textMuted'}>
            {doctor.nextSlot ? formatSlot(doctor.nextSlot) : 'Fully booked this week'}
          </ThemedText>
        </View>
        <Button
          label="Book appointment"
          icon={CalendarPlus}
          onPress={onBook}
          accessibilityLabel={`Book an appointment with ${doctor.name}`}
        />
      </View>
    </Surface>
  );
}

function Fact({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <View style={styles.fact}>
      {icon}
      <ThemedText type="caption" themeColor="textSecondary" style={styles.flex}>
        {children}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three,
    padding: Spacing.three,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two + 6,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    flexShrink: 1,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
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
    gap: 6,
    padding: Spacing.two + 4,
    borderRadius: Radius.md,
    backgroundColor: Colors.background,
  },
  fact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 4,
  },
});
