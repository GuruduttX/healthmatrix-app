import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Chip } from '@/components/ui/chip';
import { SectionHeader } from '@/components/ui/section-header';
import { Surface } from '@/components/ui/surface';
import { Spacing } from '@/constants/theme';

import { UpcomingList } from './appointments-card';
import { PastConsultsList } from './past-consults';
import { type PastConsult } from './types';
import { useAppointments } from './use-appointments';

type Tab = 'upcoming' | 'past';

/** A short note in place of an empty list, with an optional link. */
function Empty({ text, link }: { text: string; link?: { label: string; onPress: () => void } }) {
  return (
    <Surface style={styles.empty}>
      <ThemedText type="small" themeColor="textSecondary">
        {text}
      </ThemedText>
      {link ? (
        <Pressable onPress={link.onPress} accessibilityRole="button" hitSlop={8}>
          <ThemedText type="smallBold" themeColor="primary">
            {link.label}
          </ThemedText>
        </Pressable>
      ) : null}
    </Surface>
  );
}

/**
 * "Your consults" on the Care tab, with Upcoming and Past tabs. Opens on Upcoming when there is
 * one, otherwise on Past; hidden until the member has booked a consult. `past` comes from
 * `usePastConsults`, held by the Care screen so pull-to-refresh reloads it.
 */
export function ConsultsSection({ past }: { past: PastConsult[] | null }) {
  const { appointments } = useAppointments();
  const [chosen, setChosen] = useState<Tab | null>(null);

  const upcoming = appointments ?? [];
  const done = past ?? [];
  if (upcoming.length === 0 && done.length === 0) return null;

  const tab = chosen ?? (upcoming.length > 0 ? 'upcoming' : 'past');

  return (
    <View style={styles.section}>
      <SectionHeader title="Your consults" />
      <View style={styles.tabs} accessibilityRole="tablist">
        <Chip
          label={upcoming.length ? `Upcoming · ${upcoming.length}` : 'Upcoming'}
          selected={tab === 'upcoming'}
          onPress={() => setChosen('upcoming')}
        />
        <Chip
          label={done.length ? `Past · ${done.length}` : 'Past'}
          selected={tab === 'past'}
          onPress={() => setChosen('past')}
        />
      </View>

      {tab === 'upcoming' ? (
        upcoming.length ? (
          <UpcomingList appointments={upcoming} />
        ) : (
          <Empty
            text="No upcoming consults."
            link={{
              label: 'Find a doctor',
              onPress: () =>
                router.push({
                  pathname: '/care/doctors/[specialty]',
                  params: { specialty: 'general_medicine' },
                }),
            }}
          />
        )
      ) : done.length ? (
        <PastConsultsList consults={done} />
      ) : (
        <Empty text="Consults you have finished will show here, with their prescriptions." />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two + 2,
  },
  tabs: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  empty: {
    gap: Spacing.one,
    padding: Spacing.three,
  },
});
