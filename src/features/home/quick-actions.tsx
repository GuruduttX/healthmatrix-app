import { FileUp, MapPin, Pill, Video, type LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { TONES, type Tone } from '@/components/ui/icon-tile';
import { Colors, Fonts, Radius, Shadows, Spacing } from '@/constants/theme';

import { HERO_OVERLAP } from './home-hero';

export type QuickActionId = 'video-consult' | 'book-pod' | 'medicines' | 'add-records';

type QuickAction = {
  id: QuickActionId;
  label: string;
  hint: string;
  icon: LucideIcon;
  tone: Tone;
};

const ACTIONS: QuickAction[] = [
  {
    id: 'video-consult',
    label: 'Video consult',
    hint: 'A doctor, with your history open',
    icon: Video,
    tone: 'primary',
  },
  {
    id: 'book-pod',
    label: 'Book a pod',
    hint: 'Screening near you, results in minutes',
    icon: MapPin,
    tone: 'success',
  },
  {
    id: 'medicines',
    label: 'Medicines',
    hint: 'Reminders and today’s doses',
    icon: Pill,
    tone: 'warning',
  },
  {
    id: 'add-records',
    label: 'Add records',
    hint: 'Photo, PDF or WhatsApp',
    icon: FileUp,
    tone: 'neutral',
  },
];

/** The four everyday actions, on a card that rides over the bottom of the hero. */
export function QuickActions({ onPress }: { onPress: (id: QuickActionId) => void }) {
  return (
    <Animated.View entering={FadeInUp.duration(450).delay(40)} style={styles.card}>
      {ACTIONS.map(({ id, label, hint, icon: Icon, tone }) => (
        <Pressable
          key={id}
          onPress={() => onPress(id)}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityHint={hint}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
          <View style={[styles.icon, { backgroundColor: TONES[tone].soft }]}>
            <Icon size={23} color={TONES[tone].color} strokeWidth={2.1} />
          </View>
          <ThemedText type="caption" numberOfLines={2} style={styles.label}>
            {label}
          </ThemedText>
        </Pressable>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    marginTop: -HERO_OVERLAP,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.one,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
    boxShadow: Shadows.lifted,
  },
  action: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.95 }],
  },
  icon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: Fonts.semibold,
    textAlign: 'center',
    color: Colors.text,
  },
});
