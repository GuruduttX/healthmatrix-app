import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { SearchX, Syringe } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { IconTile } from '@/components/ui/icon-tile';
import { Skeleton, SkeletonGroup, SkeletonList } from '@/components/ui/skeleton';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { VaccineDetail } from '@/features/vaccines/vaccine-detail';
import { useVaccinations } from '@/features/vaccines/use-vaccinations';

const vaccineTitle = (name: string) => (/vaccin/i.test(name) ? name : `${name} vaccine`);

/** The header, progress card and doses while the vaccines load. */
function VaccineSkeleton() {
  return (
    <SkeletonGroup label="Loading this vaccine" style={styles.stack}>
      <View style={styles.header}>
        <Skeleton width={52} height={52} radius={Radius.md + 2} />
        <Skeleton width={80} height={11} />
        <Skeleton width="70%" height={24} />
      </View>
      <Skeleton height={96} radius={Radius.xl} />
      <Skeleton width={90} height={18} />
      <SkeletonList rows={3} trailing />
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
      onRefresh={refresh}>
      {vaccination ? (
        <View style={styles.stack}>
          {/* Tinted like a vaccine record on the Records timeline. */}
          <View style={styles.header}>
            <LinearGradient
              colors={[Colors.primarySoft, Colors.backgroundElement]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <IconTile icon={Syringe} tone="primary" size={52} />
            <ThemedText style={styles.kicker}>Vaccine</ThemedText>
            <ThemedText style={styles.title} accessibilityRole="header">
              {vaccineTitle(vaccination.name)}
            </ThemedText>
          </View>
          <VaccineDetail vaccination={vaccination} />
        </View>
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
    gap: Spacing.three,
  },
  header: {
    gap: Spacing.two,
    padding: Spacing.three + 2,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
    overflow: 'hidden',
  },
  kicker: {
    marginTop: Spacing.one,
    fontFamily: Fonts.bold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: Colors.primary,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 25,
    lineHeight: 31,
  },
});
