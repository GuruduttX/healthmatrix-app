import { router } from 'expo-router';
import { CalendarCheck, CalendarPlus, Stethoscope } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/ui/empty-state';
import { SectionHeader } from '@/components/ui/section-header';
import { Segmented } from '@/components/ui/segmented';
import { SkeletonList } from '@/components/ui/skeleton';
import { Spacing } from '@/constants/theme';

import { UpcomingList } from './appointments-card';
import { ConsultRequestsList } from './consult-requests-list';
import { PastConsultsList } from './past-consults';
import { type PastConsult } from './types';
import { useAppointments } from './use-appointments';
import { useConsultRequests } from './use-consult-requests';

type Tab = 'upcoming' | 'past';

const findADoctor = () =>
  router.push({ pathname: '/care/doctors/[specialty]', params: { specialty: 'general_medicine' } });

/**
 * "Your consults" on the Care tab, with Upcoming and Past tabs. Opens on Upcoming when there is
 * one, otherwise on Past; placeholder rows while they load, and hidden once loaded if the member
 * has never booked a consult. `past` comes from `usePastConsults`, held by the Care screen so
 * pull-to-refresh reloads it.
 */
export function ConsultsSection({ past }: { past: PastConsult[] | null }) {
  const { appointments } = useAppointments();
  const { requests } = useConsultRequests();
  const [chosen, setChosen] = useState<Tab | null>(null);

  if (appointments === null && past === null) {
    return (
      <View style={styles.section}>
        <SectionHeader title="Your consults" />
        <SkeletonList rows={2} label="Loading your consults" />
      </View>
    );
  }

  const upcoming = appointments ?? [];
  const asked = requests ?? [];
  const done = past ?? [];
  const upcomingCount = upcoming.length + asked.length;
  if (upcomingCount === 0 && done.length === 0) return null;

  const tab = chosen ?? (upcomingCount > 0 ? 'upcoming' : 'past');

  return (
    <View style={styles.section}>
      <SectionHeader title="Your consults" />
      <Segmented
        value={tab}
        onChange={setChosen}
        options={[
          { value: 'upcoming', label: 'Upcoming', count: upcomingCount },
          { value: 'past', label: 'Past', count: done.length },
        ]}
      />

      {tab === 'upcoming' ? (
        upcomingCount ? (
          <View style={styles.lists}>
            {asked.length ? <ConsultRequestsList requests={asked} /> : null}
            {upcoming.length ? <UpcomingList appointments={upcoming} /> : null}
          </View>
        ) : (
          <EmptyState
            icon={CalendarPlus}
            title="No upcoming consults"
            body="Book a video consult with a general physician or a specialist."
            action={{ label: 'Find a doctor', icon: Stethoscope, onPress: findADoctor }}
          />
        )
      ) : done.length ? (
        <PastConsultsList consults={done} />
      ) : (
        <EmptyState
          icon={CalendarCheck}
          tone="success"
          title="No finished consults yet"
          body="Consults you finish will show here, with their prescriptions."
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.three - 4,
  },
  lists: {
    gap: Spacing.three - 4,
  },
});
