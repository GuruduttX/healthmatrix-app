import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Spacing } from '@/constants/theme';
import { DoctorHero } from '@/features/care/doctor-hero';
import { MedicinesCard } from '@/features/care/medicines-card';
import { PodBooking } from '@/features/care/pod-booking';
import { ReminderList } from '@/features/care/reminder-list';
import { sampleCare } from '@/features/care/sample-data';
import { SpecialtyList } from '@/features/care/specialty-list';

export default function CareScreen() {
  const { doctor, pods, booking, medicines, reminders } = sampleCare;

  return (
    <Screen title="Care" subtitle="Doctors, pods, medicines and reminders.">
      <View style={styles.sections}>
        <DoctorHero doctor={doctor} />

        <View style={styles.section}>
          <SectionHeader title="Find a specialist" />
          <SpecialtyList />
        </View>

        <View style={styles.section}>
          <SectionHeader title="Pods near you" />
          <PodBooking pods={pods} booking={booking} />
        </View>

        <View style={styles.section}>
          <SectionHeader title="Medicines today" />
          <MedicinesCard person={medicines.person} doses={medicines.doses} />
        </View>

        <View style={styles.section}>
          <SectionHeader title="Reminders" />
          <ReminderList reminders={reminders} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sections: {
    gap: Spacing.three + 4,
    marginTop: Spacing.two,
  },
  section: {
    gap: Spacing.two + 2,
  },
});
