import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-context';
import { DoctorHero } from '@/features/care/doctor-hero';
import { FindPodCard } from '@/features/care/find-pod-card';
import { sampleCare } from '@/features/care/sample-data';
import { SpecialtyList } from '@/features/care/specialty-list';
import { ConsultsSection } from '@/features/doctors/consults-section';
import { refreshAppointments } from '@/features/doctors/use-appointments';
import { refreshConsultRequests } from '@/features/doctors/use-consult-requests';
import { useFeaturedDoctor } from '@/features/doctors/use-featured-doctor';
import { usePastConsults } from '@/features/doctors/use-past-consults';
import { HomeSection } from '@/features/home/home-section';
import { TodayMedicinesCard } from '@/features/reminders/today-card';
import { refreshReminders } from '@/features/reminders/use-reminders';
import { refreshVaccinations } from '@/features/vaccines/use-vaccinations';
import { VaccinesCard } from '@/features/vaccines/vaccines-card';

/** How far the featured doctor card rides up over the header. */
const OVERLAP = 56;

export default function CareScreen() {
  const { pods } = sampleCare;
  const memberId = useAuth().member?.id;
  const { featured, refresh: refreshFeatured } = useFeaturedDoctor();
  const { consults: pastConsults, refresh: refreshPast } = usePastConsults();

  // The cards below read shared stores; refreshing those updates each card.
  const refresh = async () => {
    if (!memberId) return;
    await Promise.allSettled([
      refreshAppointments(memberId),
      refreshConsultRequests(memberId),
      refreshFeatured(),
      refreshPast(),
      refreshReminders(memberId),
      refreshVaccinations(memberId),
    ]);
  };

  // A doctor's answer to a custom-time request, or a consult they cancelled, can arrive while the
  // member is elsewhere: check again whenever Care comes into view.
  useFocusEffect(
    useCallback(() => {
      if (!memberId) return;
      void Promise.allSettled([refreshAppointments(memberId), refreshConsultRequests(memberId)]);
    }, [memberId]),
  );

  return (
    <Screen
      hero
      title="Care"
      subtitle="Doctors, pods, medicines and vaccines."
      heroOverlap={OVERLAP}
      onRefresh={refresh}>
      <View style={styles.sections}>
        <HomeSection index={0}>
          <DoctorHero featured={featured} />
        </HomeSection>

        <HomeSection index={1}>
          <ConsultsSection past={pastConsults} />
        </HomeSection>

        <HomeSection title="Find a specialist" index={2}>
          <SpecialtyList />
        </HomeSection>

        <HomeSection index={3}>
          <View style={styles.section}>
            <SectionHeader
              title="Pods near you"
              actionLabel="Map"
              onAction={() => router.push('/care/pods')}
            />
            <FindPodCard pods={pods} onPress={() => router.push('/care/pods')} />
          </View>
        </HomeSection>

        <HomeSection index={4}>
          <View style={styles.section}>
            <SectionHeader
              title="Medicines today"
              actionLabel="Manage"
              onAction={() => router.push('/care/medicines')}
            />
            <TodayMedicinesCard />
          </View>
        </HomeSection>

        <HomeSection index={5}>
          <VaccinesCard />
        </HomeSection>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sections: {
    gap: Spacing.four + 4,
  },
  section: {
    gap: Spacing.three - 4,
  },
});
