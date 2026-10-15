import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SearchX, Stethoscope } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { Glass } from '@/components/ui/glass';
import { Section } from '@/components/ui/section';
import { Skeleton, SkeletonCircle, SkeletonGroup } from '@/components/ui/skeleton';
import { Surface } from '@/components/ui/surface';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { DoctorCard } from '@/features/doctors/doctor-card';
import { specialtyInfo } from '@/features/doctors/specialties';
import { type Doctor } from '@/features/doctors/types';
import { api } from '@/services/api';

const DISH = 52;

/** Two doctor cards' shape while the list loads. */
function DoctorsSkeleton() {
  return (
    <SkeletonGroup label="Loading doctors" style={styles.list}>
      <Skeleton width={140} height={20} style={styles.skeletonTitle} />
      {[0, 1].map((i) => (
        <Surface key={i} style={styles.skeletonCard}>
          <View style={styles.skeletonHeader}>
            <SkeletonCircle size={52} />
            <View style={styles.flex}>
              <Skeleton width="60%" height={16} />
              <Skeleton width="45%" height={11} style={styles.gap} />
              <Skeleton width="70%" height={10} style={styles.gap} />
            </View>
          </View>
          <View style={styles.skeletonRule} />
          <View style={styles.skeletonHeader}>
            <View style={styles.flex}>
              <Skeleton width="40%" height={10} />
              <Skeleton width="55%" height={14} style={styles.gap} />
            </View>
            <Skeleton width={84} height={40} radius={Radius.pill} />
          </View>
        </Surface>
      ))}
    </SkeletonGroup>
  );
}

/** The doctors in one specialty, each with their next free slot and a Book button. */
export default function SpecialtyDoctorsScreen() {
  const { specialty } = useLocalSearchParams<{ specialty: string }>();
  const info = specialtyInfo(specialty);

  const [doctors, setDoctors] = useState<Doctor[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** `isActive` drops the answer once the screen has moved on. */
  const load = useCallback(
    async (isActive: () => boolean) => {
      if (!info) return;
      try {
        const { doctors: list } = await api<{ doctors: Doctor[] }>(
          `/doctors?specialty=${info.id}`,
        );
        if (!isActive()) return;
        setDoctors(list);
        setError(null);
      } catch (e) {
        if (isActive()) setError(e instanceof Error ? e.message : 'Could not load doctors');
      }
    },
    [info],
  );

  // Load again whenever the screen comes back into view (say, after booking), so each doctor's
  // next free slot is never stale.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      void load(() => active);
      return () => {
        active = false;
      };
    }, [load]),
  );

  const Icon = info?.icon ?? Stethoscope;
  const count = doctors?.length ?? 0;

  return (
    <Screen
      onBack={() => router.dismissTo('/care')}
      backLabel="Care"
      barTitle="Doctors"
      title={info?.label}
      subtitle={info?.blurb}
      headerRight={
        info ? (
          // The specialty's icon in a round glass dish, as on the Care tab.
          <Glass variant="small" radius={DISH / 2} style={styles.dish}>
            <View style={[StyleSheet.absoluteFill, styles.center]}>
              <Icon size={24} color={Colors.primaryDeep} strokeWidth={2.1} />
            </View>
          </Glass>
        ) : undefined
      }
      onRefresh={() => load(() => true)}>
      {!info ? (
        <EmptyState
          icon={SearchX}
          tone="neutral"
          title="Unknown specialty"
          body="Go back and pick a specialty from the Care tab."
        />
      ) : !doctors ? (
        error ? (
          <ErrorState
            title="Couldn’t load doctors"
            message={error}
            onRetry={() => void load(() => true)}
          />
        ) : (
          <DoctorsSkeleton />
        )
      ) : !doctors.length ? (
        <EmptyState
          icon={SearchX}
          tone="neutral"
          title={`No ${info.label.toLowerCase()} doctors yet`}
          body="We’re adding doctors every week. A general physician can help in the meantime and refer you on."
          action={
            info.id === 'general_medicine'
              ? undefined
              : {
                  label: 'See general physicians',
                  icon: Stethoscope,
                  onPress: () =>
                    router.replace({
                      pathname: '/care/doctors/[specialty]',
                      params: { specialty: 'general_medicine' },
                    }),
                }
          }
        />
      ) : (
        <Section
          title="Video consults"
          meta={`${count} ${count === 1 ? 'doctor' : 'doctors'}`}
          index={0}>
          <View style={styles.list}>
            {doctors.map((doctor) => (
              <DoctorCard
                key={doctor.id}
                doctor={doctor}
                specialty={info.id}
                onBook={() =>
                  router.push({
                    pathname: '/care/book/[doctorId]',
                    params: { doctorId: doctor.id, specialty: info.id },
                  })
                }
              />
            ))}
          </View>
        </Section>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gap: {
    marginTop: 8,
  },
  dish: {
    width: DISH,
    height: DISH,
  },
  list: {
    gap: Spacing.three - 4,
  },
  skeletonTitle: {
    marginBottom: 2,
  },
  skeletonCard: {
    gap: Spacing.three - 4,
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
  },
  skeletonRule: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: -Spacing.three,
    backgroundColor: Colors.hairline,
  },
});
