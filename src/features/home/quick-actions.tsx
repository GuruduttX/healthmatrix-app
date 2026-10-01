import { MapPin, Sparkles, Upload, Video, type LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';

export type QuickActionId = 'ask-ekaay' | 'video-consult' | 'book-pod' | 'add-records';

const ACTIONS: { id: QuickActionId; label: string; icon: LucideIcon; color: string; soft: string }[] = [
  { id: 'ask-ekaay', label: 'Ask Ekaay', icon: Sparkles, color: Colors.primary, soft: Colors.primarySoft },
  { id: 'video-consult', label: 'Video consult', icon: Video, color: Colors.inkMid, soft: Colors.backgroundSelected },
  { id: 'book-pod', label: 'Book a pod', icon: MapPin, color: Colors.primary, soft: Colors.primarySoft },
  { id: 'add-records', label: 'Add records', icon: Upload, color: Colors.success, soft: Colors.successSoft },
];

export function QuickActions({ onPress }: { onPress: (id: QuickActionId) => void }) {
  return (
    <View style={styles.grid}>
      {ACTIONS.map(({ id, label, icon: Icon, color, soft }) => (
        <Pressable
          key={id}
          onPress={() => onPress(id)}
          accessibilityRole="button"
          style={({ pressed }) => [styles.tile, pressed && styles.pressed]}>
          <View style={[styles.icon, { backgroundColor: soft }]}>
            <Icon size={20} color={color} strokeWidth={2} />
          </View>
          <ThemedText type="smallBold" numberOfLines={2} style={styles.label}>
            {label}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two + 2,
  },
  tile: {
    // Two per row: grow from a 40% basis so the gap never forces a wrap.
    flexGrow: 1,
    flexBasis: '40%',
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 2,
    padding: 12,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
    boxShadow: Shadows.card,
  },
  pressed: {
    opacity: 0.75,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
  },
});
