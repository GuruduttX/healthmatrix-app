import {
  Apple,
  Baby,
  Brain,
  Droplet,
  HeartPulse,
  ScanFace,
  Stethoscope,
  Venus,
  type LucideIcon,
} from 'lucide-react-native';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';

import { SPECIALTIES, type Specialty } from './sample-data';

const ICONS: Record<Specialty, LucideIcon> = {
  'General medicine': Stethoscope,
  'Diabetes and endocrinology': Droplet,
  Cardiology: HeartPulse,
  Paediatrics: Baby,
  Gynaecology: Venus,
  Dermatology: ScanFace,
  Psychiatry: Brain,
  Nutrition: Apple,
};

/** Sideways-scrolling row of the specialties on the network. */
export function SpecialtyList() {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.content}>
      {SPECIALTIES.map((specialty) => {
        const Icon = ICONS[specialty];
        return (
          <View key={specialty} style={styles.item}>
            <View style={styles.icon}>
              <Icon size={20} color={Colors.primary} strokeWidth={2} />
            </View>
            <ThemedText type="caption" style={styles.label} numberOfLines={2}>
              {specialty}
            </ThemedText>
          </View>
        );
      })}
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
