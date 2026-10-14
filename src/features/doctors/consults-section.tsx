import { router } from 'expo-router';
import { CalendarCheck, CalendarPlus, Stethoscope } from 'lucide-react-native';
import { useState } from 'react';

import { EmptyState } from '@/components/ui/empty-state';
import { ScrollingListCard } from '@/components/ui/list';
import { Section } from '@/components/ui/section';
import { Segmented } from '@/components/ui/segmented';
import { SkeletonList } from '@/components/ui/skeleton';

import { useNow } from '@/features/reminders/use-now';

import { UpcomingList } from './appointments-card';
import { ConsultRequestRow, ConsultRequestsList } from './consult-requests-list';
import { PastConsultRow } from './past-consults';
import { type ConsultRequest, type PastConsult } from './types';
import { useAppointments } from './use-appointments';
import { useConsultRequests } from './use-consult-requests';

type Tab = 'upcoming' | 'past';

const TITLE = 'Your consults';

const findADoctor = () =>
  router.push({ pathname: '/care/doctors/[specialty]', params: { specialty: 'general_medicine' } });

/** A Past-tab line: a finished consult, or a request whose time came and went. */
type PastItem =
  | { kind: 'consult'; at: string; consult: PastConsult }
  | { kind: 'request'; at: string; request: ConsultRequest };

/**
 * "Your consults" on the Care tab, with Upcoming and Past tabs. Opens on Upcoming when there is
 * one, otherwise on Past; placeholder rows while they load, and hidden once loaded if the member
 * has never booked a consult. A custom-time request moves to Past once its time has passed,
 * answered or not, newest first among the finished consults. `past` comes from `usePastConsults`, held by the Care screen so
 * pull-to-refresh reloads it. `index` is its place on the page, for the section's ease-in.
 */
export function ConsultsSection({ past, index }: { past: PastConsult[] | null; index?: number }) {
  const { appointments } = useAppointments();
  const { requests } = useConsultRequests();
  const [chosen, setChosen] = useState<Tab | null>(null);
  // Ticks each minute, so a request moves to Past when its time comes.
  const now = useNow().getTime();

  if (appointments === null && past === null) {
    return (
      <Section title={TITLE} index={index}>
        <SkeletonList rows={2} label="Loading your consults" />
      </Section>
    );
  }

  const upcoming = appointments ?? [];
  const gone = (request: ConsultRequest) => Date.parse(request.requestedAt) <= now;
  const asked = (requests ?? []).filter((request) => !gone(request));
  // Still pending when its time came means the doctor didn't answer in time.
  const lapsed = (requests ?? [])
    .filter(gone)
    .map((request) =>
      request.status === 'pending' ? { ...request, status: 'expired' as const } : request,
    );
  const done: PastItem[] = [
    ...(past ?? []).map((consult) => ({ kind: 'consult' as const, at: consult.scheduledAt, consult })),
    ...lapsed.map((request) => ({ kind: 'request' as const, at: request.requestedAt, request })),
  ].sort((a, b) => b.at.localeCompare(a.at));
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
          // Requests and booked consults share one card, a hairline between them, three at a time.
          <ScrollingListCard rows={3}>
            {asked.length ? <ConsultRequestsList requests={asked} /> : null}
            {upcoming.length ? <UpcomingList appointments={upcoming} /> : null}
          </ScrollingListCard>
        ) : (
          <EmptyState
            icon={CalendarPlus}
            title="No upcoming consults"
            body="Book a video consult with a general physician or a specialist."
            action={{ label: 'Find a doctor', icon: Stethoscope, onPress: findADoctor }}
          />
        )
      ) : done.length ? (
        <ScrollingListCard rows={3}>
          {done.map((item) =>
            item.kind === 'consult' ? (
              <PastConsultRow key={item.consult.id} consult={item.consult} />
            ) : (
              <ConsultRequestRow key={item.request.id} request={item.request} />
            ),
          )}
        </ScrollingListCard>
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
