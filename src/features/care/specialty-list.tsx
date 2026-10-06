import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { SPECIALTIES } from '@/features/doctors/specialties';

/** Sideways-scrolling row of the specialties on the network. Tap one to see its doctors. */
export function SpecialtyList() {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.content}>
      {SPECIALTIES.map(({ id, label, icon: Icon }) => (
        <Pressable
          key={id}
          onPress={() =>
            router.push({ pathname: '/care/doctors/[specialty]', params: { specialty: id } })
          }
          accessibilityRole="button"
          accessibilityLabel={`${label} doctors`}
          style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
          <View style={styles.icon}>
            <Icon size={20} color={Colors.primary} strokeWidth={2} />
          </View>
          <ThemedText type="caption" style={styles.label} numberOfLines={2}>
            {label}
          </ThemedText>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Bleed to the screen edges so the row scrolls under the page padding.
  scroll: {
    flexGrow: 0,
    marginHorizontal: -Spacing.three,
  },
  content: {
    gap: Spacing.two + 2,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  item: {
    width: 92,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
    boxShadow: Shadows.card,
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.97 }],
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primarySoft,
  },
  label: {
    textAlign: 'center',
    color: Colors.text,
  },
});
