import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { Screen } from '@/components/screen';
import { Section } from '@/components/ui/section';
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
import { TodayMedicinesCard } from '@/features/reminders/today-card';
import { refreshReminders } from '@/features/reminders/use-reminders';
import { refreshVaccinations } from '@/features/vaccines/use-vaccinations';
import { VaccinesCard } from '@/features/vaccines/vaccines-card';

const openPods = () => router.push('/care/pods');

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

  // The page puts 20pt between sections, as on Home. Consults and vaccines hide themselves when
  // there are none, so they bring their own titled section.
  return (
    <Screen
      hero
      title="Care"
      subtitle="Doctors, pods, medicines and vaccines."
      onRefresh={refresh}>
      <Section index={0}>
        <DoctorHero featured={featured} />
      </Section>

      <ConsultsSection past={pastConsults} index={1} />

      <Section title="Find a specialist" index={2}>
        <SpecialtyList />
      </Section>

      <Section title="Pods near you" actionLabel="Map" onAction={openPods} index={3}>
        <FindPodCard pods={pods} onPress={openPods} />
      </Section>

      <Section
        title="Medicines today"
        actionLabel="Manage"
        onAction={() => router.push('/care/medicines')}
        index={4}>
        <TodayMedicinesCard />
      </Section>

      <VaccinesCard index={5} />
    </Screen>
  );
}
