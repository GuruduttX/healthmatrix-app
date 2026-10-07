import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { VaccineDetail } from '@/features/vaccines/vaccine-detail';
import { useVaccinations } from '@/features/vaccines/use-vaccinations';

const vaccineTitle = (name: string) => (/vaccin/i.test(name) ? name : `${name} vaccine`);

/**
 * A vaccine opened from the Care tab or a dose notification. It lives in the Care stack, so
 * Back returns to Care; the same vaccine opened from Records uses `/records/[id]`.
 */
export default function CareVaccineScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { vaccinations, error } = useVaccinations();
  const vaccination = vaccinations?.find((v) => v.id === id);

  return (
    <Screen>
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.dismissTo('/care'))}
        accessibilityRole="button"
        accessibilityLabel="Back to Care"
        hitSlop={10}
        style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
        <ChevronLeft size={16} color={Colors.textSecondary} strokeWidth={2.2} />
        <ThemedText type="small" themeColor="textSecondary">
          Care
        </ThemedText>
      </Pressable>

      {vaccination ? (
        <>
          <ThemedText type="title" style={styles.title}>
            {vaccineTitle(vaccination.name)}
          </ThemedText>
          <VaccineDetail vaccination={vaccination} />
        </>
      ) : (
        <View style={styles.missing}>
          {vaccinations || error ? (
            <>
              <ThemedText type="bodyBold">Vaccine not found</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {error ?? 'It may have been removed by your doctor.'}
              </ThemedText>
            </>
          ) : (
            <ActivityIndicator color={Colors.textSecondary} />
          )}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.one,
  },
  pressed: {
    opacity: 0.7,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
  },
  missing: {
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.five,
  },
});
