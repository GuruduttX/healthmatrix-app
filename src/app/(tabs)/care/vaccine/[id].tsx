import { router, useLocalSearchParams } from 'expo-router';
import { SearchX } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { Skeleton, SkeletonCircle, SkeletonGroup } from '@/components/ui/skeleton';
import { Surface } from '@/components/ui/surface';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { VaccineDetail } from '@/features/vaccines/vaccine-detail';
import { useVaccinations } from '@/features/vaccines/use-vaccinations';

const vaccineTitle = (name: string) => (/vaccin/i.test(name) ? name : `${name} vaccine`);

/** The title, the doses card and how it's given while the vaccines load. */
function VaccineSkeleton() {
  return (
    <SkeletonGroup label="Loading this vaccine" style={styles.stack}>
      <Skeleton width="65%" height={28} />
      <Surface style={styles.skeletonCard}>
        <View style={styles.skeletonRow}>
          <SkeletonCircle size={40} />
          <View style={styles.skeletonText}>
            <Skeleton width="55%" height={15} />
            <Skeleton width="40%" height={11} />
          </View>
          <Skeleton width={52} height={20} radius={Radius.pill} />
        </View>
        <View style={styles.skeletonRule} />
        <View style={styles.skeletonRow}>
          <SkeletonCircle size={30} style={styles.skeletonDot} />
          <View style={styles.skeletonText}>
            <Skeleton width="35%" height={13} />
            <Skeleton width="30%" height={10} />
          </View>
          <Skeleton width={104} height={32} radius={Radius.pill} />
        </View>
      </Surface>
      <Skeleton width={130} height={20} />
      <Surface style={styles.skeletonFacts}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[styles.skeletonFact, i > 0 && styles.skeletonDivider]}>
            <Skeleton width={56} height={12} />
            <Skeleton width={i ? 110 : 60} height={13} />
          </View>
        ))}
      </Surface>
    </SkeletonGroup>
  );
}

/**
 * A vaccine opened from the Care tab or a dose notification. It lives in the Care stack, so
 * Back returns to Care; the same vaccine opened from Records uses `/records/[id]`.
 */
export default function CareVaccineScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { vaccinations, error, refresh } = useVaccinations();
  const vaccination = vaccinations?.find((v) => v.id === id);

  return (
    <Screen
      onBack={() => (router.canGoBack() ? router.back() : router.dismissTo('/care'))}
      backLabel="Care"
      barTitle="Vaccine"
      title={vaccination ? vaccineTitle(vaccination.name) : undefined}
      onRefresh={refresh}>
      {vaccination ? (
        <VaccineDetail vaccination={vaccination} />
      ) : vaccinations ? (
        <EmptyState
          icon={SearchX}
          tone="neutral"
          title="Vaccine not found"
          body="It may have been removed by your doctor."
          action={{ label: 'Back to Care', onPress: () => router.dismissTo('/care') }}
        />
      ) : error ? (
        <ErrorState title="Couldn’t load this vaccine" message={error} onRetry={refresh} />
      ) : (
        <VaccineSkeleton />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: Spacing.four - 4,
  },
  skeletonCard: {
    paddingHorizontal: Spacing.three - 2,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
  },
  skeletonDot: {
    marginHorizontal: 5,
  },
  skeletonText: {
    flex: 1,
    gap: 8,
  },
  skeletonFacts: {
    paddingHorizontal: Spacing.three - 2,
    paddingVertical: Spacing.one,
  },
  skeletonFact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  skeletonDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.hairline,
  },
  skeletonRule: {
    height: StyleSheet.hairlineWidth,
    marginVertical: Spacing.three - 2,
    marginHorizontal: -(Spacing.three - 2),
    backgroundColor: Colors.hairline,
  },
});
