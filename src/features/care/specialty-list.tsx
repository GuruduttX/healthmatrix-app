import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { TONES } from '@/components/ui/icon-tile';
import { Colors, Fonts, Radius, Shadows, Spacing } from '@/constants/theme';
import { SPECIALTIES } from '@/features/doctors/specialties';

/** The specialties on the network as a grid of tiles, four to a row. Tap one to see its doctors. */
export function SpecialtyList() {
  return (
    <View style={styles.card}>
      {SPECIALTIES.map(({ id, label, short, icon: Icon, tone }) => (
        <Pressable
          key={id}
          onPress={() =>
            router.push({ pathname: '/care/doctors/[specialty]', params: { specialty: id } })
          }
          accessibilityRole="button"
          accessibilityLabel={`${label} doctors`}
          style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
          <View style={[styles.icon, { backgroundColor: TONES[tone].soft }]}>
            <Icon size={22} color={TONES[tone].color} strokeWidth={2.1} />
          </View>
          <ThemedText style={styles.label} numberOfLines={2}>
            {short}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.one,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
    boxShadow: Shadows.card,
  },
  item: {
    width: '25%',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: 2,
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  icon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: Fonts.semibold,
    fontSize: 12,
    lineHeight: 15,
    textAlign: 'center',
    color: Colors.text,
  },
});
