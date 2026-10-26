import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { Screen } from '@/components/screen';
import { Section } from '@/components/ui/section';
import { useAuth } from '@/features/auth/auth-context';
import { FindPodCard } from '@/features/care/find-pod-card';
import { HealthChecksCard } from '@/features/care/health-checks-card';
import { PodBookingsCard } from '@/features/care/pod-bookings-card';
import { SpecialtyList } from '@/features/care/specialty-list';
import { refreshPodBookings, usePodBookings } from '@/features/care/use-pod-bookings';
import { podCatalogLoaded, usePodCatalog } from '@/features/care/use-pod-catalog';
import { ConsultsSection } from '@/features/doctors/consults-section';
import { refreshAppointments } from '@/features/doctors/use-appointments';
import { refreshConsultRequests } from '@/features/doctors/use-consult-requests';
import { usePastConsults } from '@/features/doctors/use-past-consults';
import { TodayMedicinesCard } from '@/features/reminders/today-card';
import { SupportCard } from '@/features/support/support-card';
import { refreshSupport } from '@/features/support/use-support';
import { refreshReminders } from '@/features/reminders/use-reminders';
import { refreshVaccinations } from '@/features/vaccines/use-vaccinations';
import { VaccinesCard } from '@/features/vaccines/vaccines-card';

const openPods = () => router.push('/care/pods');

export default function CareScreen() {
  const { catalog, error: podError, refresh: refreshPods } = usePodCatalog();
  const { bookings: podBookings } = usePodBookings();
  const memberId = useAuth().member?.id;
  const { consults: pastConsults, error: pastError, refresh: refreshPast } = usePastConsults();

  // The cards below read shared stores; refreshing those updates each card.
  const refresh = async () => {
    if (!memberId) return;
    await Promise.allSettled([
      refreshAppointments(memberId),
      refreshConsultRequests(memberId),
      refreshPast(),
      refreshReminders(memberId),
      refreshVaccinations(memberId),
      refreshPods(),
      refreshPodBookings(memberId),
      refreshSupport(memberId),
    ]);
  };

  // A doctor's answer to a custom-time request, or a consult they cancelled, can arrive while the
  // member is elsewhere: check again whenever Care comes into view.
  useFocusEffect(
    useCallback(() => {
      if (!memberId) return;
      // Pod results come in while the member is away too.
      void Promise.allSettled([
        refreshAppointments(memberId),
        refreshConsultRequests(memberId),
        refreshPodBookings(memberId),
        // The support team's replies.
        refreshSupport(memberId),
      ]);
      // Pods that failed to load get another try each time Care comes back into view.
      if (!podCatalogLoaded()) void refreshPods();
    }, [memberId, refreshPods]),
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
        <SpecialtyList />
      </Section>

      <ConsultsSection past={pastConsults} pastError={pastError} index={1} />

      <Section title="Pods near you" actionLabel="Map" onAction={openPods} index={3}>
        <FindPodCard pods={catalog?.pods ?? null} error={podError} onPress={openPods} />
      </Section>

      <PodBookingsCard bookings={podBookings} index={4} />

      <HealthChecksCard profiles={catalog?.profiles ?? null} failed={!!podError} index={5} />

      <Section
        title="Medicines today"
        actionLabel="Manage"
        onAction={() => router.push('/care/medicines')}
        index={6}>
        <TodayMedicinesCard />
      </Section>

      <VaccinesCard index={7} />

      <SupportCard index={8} />
    </Screen>
  );
}
