import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SearchX, Stethoscope, UserRound } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { TONES } from '@/components/ui/icon-tile';
import { Skeleton, SkeletonCircle, SkeletonGroup } from '@/components/ui/skeleton';
import { Colors, Fonts, Radius, Shadows, Spacing } from '@/constants/theme';
import { DoctorCard } from '@/features/doctors/doctor-card';
import { specialtyInfo } from '@/features/doctors/specialties';
import { type Doctor } from '@/features/doctors/types';
import { api } from '@/services/api';

/** Two doctor cards' shape while the list loads. */
function DoctorsSkeleton() {
  return (
    <SkeletonGroup label="Loading doctors" style={styles.list}>
      {[0, 1].map((i) => (
        <View key={i} style={styles.skeletonCard}>
          <View style={styles.skeletonHeader}>
            <SkeletonCircle size={56} />
            <View style={styles.flex}>
              <Skeleton width="60%" height={16} />
              <Skeleton width="40%" height={11} style={styles.gap} />
            </View>
          </View>
          <View style={styles.skeletonPills}>
            <Skeleton width={90} height={26} radius={Radius.pill} />
            <Skeleton width={110} height={26} radius={Radius.pill} />
          </View>
          <Skeleton height={64} radius={Radius.md + 2} />
        </View>
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
  const tone = info?.tone ?? 'primary';
  const count = doctors?.length ?? 0;

  return (
    <Screen
      onBack={() => router.dismissTo('/care')}
      backLabel="Care"
      barTitle="Doctors"
      onRefresh={() => load(() => true)}>
      <View style={styles.stack}>
        {info ? (
          // Tinted in the specialty's colour, like its tile on the Care tab.
          <View style={styles.intro}>
            <LinearGradient
              colors={[TONES[tone].soft, Colors.backgroundElement]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.introIcon}>
              <Icon size={24} color={TONES[tone].color} strokeWidth={2.1} />
            </View>
            <View style={styles.introText}>
              <ThemedText style={styles.title} accessibilityRole="header" numberOfLines={2}>
                {info.label}
              </ThemedText>
              <ThemedText type="caption" themeColor="textSecondary" numberOfLines={2}>
                {info.blurb}
              </ThemedText>
              {doctors?.length ? (
                <View style={styles.count}>
                  <UserRound size={12} color={TONES[tone].color} strokeWidth={2.4} />
                  <ThemedText style={[styles.countText, { color: TONES[tone].color }]}>
                    {count} {count === 1 ? 'doctor' : 'doctors'} · Video consults
                  </ThemedText>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

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
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: Spacing.three + 4,
  },
  flex: {
    flex: 1,
  },
  gap: {
    marginTop: 8,
  },
  // One compact row: the specialty's tile, then its name, what it covers and the count.
  intro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
    padding: 14,
    borderRadius: Radius.lg + 4,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
    overflow: 'hidden',
  },
  // White, so it stands out from the card's tint.
  introIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundElement,
    boxShadow: Shadows.card,
  },
  introText: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 18,
    lineHeight: 23,
  },
  count: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    marginTop: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: Radius.pill,
    backgroundColor: Colors.backgroundElement,
  },
  countText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    lineHeight: 14,
  },
  list: {
    gap: Spacing.three,
  },
  skeletonCard: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
    boxShadow: Shadows.card,
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
  },
  skeletonPills: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
});
