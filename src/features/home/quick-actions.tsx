import { LinearGradient } from 'expo-linear-gradient';
import { FileUp, MapPin, Pill, Video, type LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Radius, Shadows, Spacing } from '@/constants/theme';

import { HERO_OVERLAP } from './home-hero';

export type QuickActionId = 'video-consult' | 'book-pod' | 'medicines' | 'add-records';

type QuickAction = {
  id: QuickActionId;
  label: string;
  hint: string;
  icon: LucideIcon;
  /** The tile's gradient, light to deep. */
  colors: readonly [string, string];
};

const ACTIONS: QuickAction[] = [
  {
    id: 'video-consult',
    label: 'Video consult',
    hint: 'A doctor, with your history open',
    icon: Video,
    colors: ['#F48A5A', Colors.primary],
  },
  {
    id: 'book-pod',
    label: 'Book Pod',
    hint: 'Screening near you, results in minutes',
    icon: MapPin,
    colors: ['#2DB394', Colors.success],
  },
  {
    id: 'medicines',
    label: 'Medicines',
    hint: 'Reminders and today’s doses',
    icon: Pill,
    colors: ['#F5B544', '#D08A0A'],
  },
  {
    id: 'add-records',
    label: 'Records',
    hint: 'Photo, PDF or WhatsApp',
    icon: FileUp,
    colors: ['#4A7C88', Colors.ink],
  },
];

const TILE = 56;

/** The four everyday actions, on a card that rides over the bottom of the hero. */
export function QuickActions({ onPress }: { onPress: (id: QuickActionId) => void }) {
  return (
    <Animated.View entering={FadeInUp.duration(450).delay(40)} style={styles.card}>
      {ACTIONS.map(({ id, label, hint, icon: Icon, colors }) => (
        <Pressable
          key={id}
          onPress={() => onPress(id)}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityHint={hint}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
          {/* The tile clips its gradient to the corners. */}
          <View style={styles.tile}>
            <LinearGradient
              colors={colors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            {/* A soft highlight on the top-left, like light on glass. */}
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.32)', 'rgba(255, 255, 255, 0)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.7, y: 0.7 }}
              style={StyleSheet.absoluteFill}
            />
            {/* In a View, so it paints above the gradient layers on web too. */}
            <View>
              <Icon size={24} color={Colors.onInk} strokeWidth={2.2} />
            </View>
          </View>
          <ThemedText numberOfLines={2} style={styles.label}>
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
    paddingTop: Spacing.three + 2,
    paddingBottom: Spacing.three,
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
    gap: Spacing.two + 2,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.94 }],
  },
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  label: {
    fontFamily: Fonts.semibold,
    fontSize: 12.5,
    lineHeight: 16,
    textAlign: 'center',
    color: Colors.text,
  },
});
