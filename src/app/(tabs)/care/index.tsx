import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Spacing } from '@/constants/theme';
import { DoctorHero } from '@/features/care/doctor-hero';
import { FindPodCard } from '@/features/care/find-pod-card';
import { ReminderList } from '@/features/care/reminder-list';
import { sampleCare } from '@/features/care/sample-data';
import { SpecialtyList } from '@/features/care/specialty-list';
import { UpcomingAppointments } from '@/features/doctors/appointments-card';
import { TodayMedicinesCard } from '@/features/reminders/today-card';

export default function CareScreen() {
  const { doctor, pods, reminders } = sampleCare;

  return (
    <Screen title="Care" subtitle="Doctors, pods, medicines and reminders.">
      <View style={styles.sections}>
        <DoctorHero doctor={doctor} />

        <UpcomingAppointments />

        <View style={styles.section}>
          <SectionHeader title="Find a specialist" />
          <SpecialtyList />
        </View>

        <View style={styles.section}>
          <SectionHeader title="Pods near you" />
          <FindPodCard pods={pods} onPress={() => router.push('/care/pods')} />
        </View>

        <View style={styles.section}>
          <SectionHeader
            title="Medicines today"
            actionLabel="Manage"
            onAction={() => router.push('/care/medicines')}
          />
          <TodayMedicinesCard />
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
