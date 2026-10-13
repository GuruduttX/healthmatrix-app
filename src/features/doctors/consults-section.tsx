import { router } from 'expo-router';
import { CalendarCheck, CalendarPlus, Stethoscope } from 'lucide-react-native';
import { useState } from 'react';

import { EmptyState } from '@/components/ui/empty-state';
import { ListCard } from '@/components/ui/list';
import { Section } from '@/components/ui/section';
import { Segmented } from '@/components/ui/segmented';
import { SkeletonList } from '@/components/ui/skeleton';

import { UpcomingList } from './appointments-card';
import { ConsultRequestsList } from './consult-requests-list';
import { PastConsultsList } from './past-consults';
import { type PastConsult } from './types';
import { useAppointments } from './use-appointments';
import { useConsultRequests } from './use-consult-requests';

type Tab = 'upcoming' | 'past';

const TITLE = 'Your consults';

const findADoctor = () =>
  router.push({ pathname: '/care/doctors/[specialty]', params: { specialty: 'general_medicine' } });

/**
 * "Your consults" on the Care tab, with Upcoming and Past tabs. Opens on Upcoming when there is
 * one, otherwise on Past; placeholder rows while they load, and hidden once loaded if the member
 * has never booked a consult. `past` comes from `usePastConsults`, held by the Care screen so
 * pull-to-refresh reloads it. `index` is its place on the page, for the section's ease-in.
 */
export function ConsultsSection({ past, index }: { past: PastConsult[] | null; index?: number }) {
  const { appointments } = useAppointments();
  const { requests } = useConsultRequests();
  const [chosen, setChosen] = useState<Tab | null>(null);

  if (appointments === null && past === null) {
    return (
      <Section title={TITLE} index={index}>
        <SkeletonList rows={2} label="Loading your consults" />
      </Section>
    );
  }

  const upcoming = appointments ?? [];
  const asked = requests ?? [];
  const done = past ?? [];
  const upcomingCount = upcoming.length + asked.length;
  if (upcomingCount === 0 && done.length === 0) return null;

  const tab = chosen ?? (upcomingCount > 0 ? 'upcoming' : 'past');

  return (
    <Section title={TITLE} index={index}>
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
          // Requests and booked consults share one card, a hairline between them.
          <ListCard>
            {asked.length ? <ConsultRequestsList requests={asked} /> : null}
            {upcoming.length ? <UpcomingList appointments={upcoming} /> : null}
          </ListCard>
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
          title="No finished consults yet"
          body="Consults you finish will show here, with their prescriptions."
        />
      )}
    </Section>
  );
}
