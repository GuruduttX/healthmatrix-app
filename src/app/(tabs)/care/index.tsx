import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-context';
import { DoctorHero } from '@/features/care/doctor-hero';
import { FindPodCard } from '@/features/care/find-pod-card';
import { sampleCare } from '@/features/care/sample-data';
import { SpecialtyList } from '@/features/care/specialty-list';
import { UpcomingAppointments } from '@/features/doctors/appointments-card';
import { refreshAppointments } from '@/features/doctors/use-appointments';
import { TodayMedicinesCard } from '@/features/reminders/today-card';
import { refreshReminders } from '@/features/reminders/use-reminders';
import { refreshVaccinations } from '@/features/vaccines/use-vaccinations';
import { VaccinesCard } from '@/features/vaccines/vaccines-card';

export default function CareScreen() {
  const { doctor, pods } = sampleCare;
  const memberId = useAuth().member?.id;

  // The cards below read shared stores; refreshing those updates each card.
  const refresh = async () => {
    if (!memberId) return;
    await Promise.allSettled([
      refreshAppointments(memberId),
      refreshReminders(memberId),
      refreshVaccinations(memberId),
    ]);
  };

  return (
    <Screen title="Care" subtitle="Doctors, pods, medicines and vaccines." onRefresh={refresh}>
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

        <VaccinesCard />
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
