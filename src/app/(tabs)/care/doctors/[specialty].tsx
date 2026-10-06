import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, SearchX, Stethoscope } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Surface } from '@/components/ui/surface';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { DoctorCard } from '@/features/doctors/doctor-card';
import { specialtyInfo } from '@/features/doctors/specialties';
import { type Doctor } from '@/features/doctors/types';
import { useTabBarClearance } from '@/hooks/use-tab-bar-clearance';
import { api } from '@/services/api';

/** The doctors in one specialty, each with their next free slot and a Book button. */
export default function SpecialtyDoctorsScreen() {
  const { specialty } = useLocalSearchParams<{ specialty: string }>();
  const info = specialtyInfo(specialty);
  const clearance = useTabBarClearance();

  const [doctors, setDoctors] = useState<Doctor[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    if (!info) return;
    let active = true;
    api<{ doctors: Doctor[] }>(`/doctors?specialty=${info.id}`)
      .then(({ doctors: list }) => {
        if (!active) return;
        setDoctors(list);
        setError(null);
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : 'Could not load doctors');
      })
      .finally(() => {
        if (active) setRefreshing(false);
      });
    return () => {
      active = false;
    };
  }, [info]);

  // Load again whenever the screen comes back into view (say, after booking), so each doctor's
  // next free slot is never stale.
  useFocusEffect(load);

  const refresh = () => {
    setRefreshing(true);
    load();
  };

  const Icon = info?.icon ?? Stethoscope;
  const count = doctors?.length ?? 0;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.dismissTo('/care')}
            accessibilityRole="button"
            accessibilityLabel="Back to Care"
            hitSlop={8}
            style={({ pressed }) => [styles.round, pressed && styles.pressed]}>
            <ChevronLeft size={20} color={Colors.text} strokeWidth={2.2} />
          </Pressable>
          <View style={styles.flex}>
            <ThemedText type="subtitle" numberOfLines={1}>
              {info?.label ?? 'Doctors'}
            </ThemedText>
            {doctors ? (
              <ThemedText type="caption" themeColor="textSecondary">
                {count} {count === 1 ? 'doctor' : 'doctors'} · Video consults
              </ThemedText>
            ) : null}
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
          contentContainerStyle={[styles.content, { paddingBottom: clearance + Spacing.three }]}>
          {info ? (
            <View style={styles.intro}>
              <View style={styles.introIcon}>
                <Icon size={22} color={Colors.primary} strokeWidth={2} />
              </View>
              <ThemedText type="small" style={styles.flex}>
                {info.blurb}
              </ThemedText>
            </View>
          ) : null}

          {!info ? (
            <Empty
              title="Unknown specialty"
              text="Go back and pick a specialty from the Care tab."
            />
          ) : !doctors ? (
            <View style={styles.loading}>
              {error ? (
                <>
                  <ThemedText type="small" themeColor="danger" style={styles.center}>
                    {error}
                  </ThemedText>
                  <Button label="Try again" variant="secondary" onPress={refresh} />
                </>
              ) : (
                <ActivityIndicator color={Colors.textSecondary} />
              )}
            </View>
          ) : !doctors.length ? (
            <Empty
              title={`No ${info.label.toLowerCase()} doctors yet`}
              text="We’re adding doctors every week. A general physician can help in the meantime and refer you on."
              action={
                info.id === 'general_medicine'
                  ? undefined
                  : {
                      label: 'See general physicians',
                      onPress: () =>
                        router.replace({
                          pathname: '/care/doctors/[specialty]',
                          params: { specialty: 'general_medicine' },
                        }),
                    }
              }
            />
          ) : (
            doctors.map((doctor) => (
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
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Empty({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <Surface style={styles.empty}>
      <SearchX size={28} color={Colors.textMuted} strokeWidth={2} />
      <ThemedText type="bodyBold" style={styles.center}>
        {title}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
        {text}
      </ThemedText>
      {action ? <Button label={action.label} variant="secondary" onPress={action.onPress} /> : null}
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  flex: {
    flex: 1,
  },
  center: {
    textAlign: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 4,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  round: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pressed: {
    opacity: 0.75,
  },
  content: {
    gap: Spacing.three,
    padding: Spacing.three,
    paddingTop: Spacing.one,
  },
  intro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 4,
    padding: 14,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primarySoft,
  },
  introIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundElement,
  },
  loading: {
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.six,
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.two + 2,
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.four,
  },
});
