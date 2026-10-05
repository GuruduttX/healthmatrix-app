import { Image, type ImageSource } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, Sparkles, Upload, Video, type LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';

export type QuickActionId = 'ask-ekaay' | 'video-consult' | 'book-pod' | 'add-records';

type QuickAction = {
  id: QuickActionId;
  label: string;
  caption: string;
  icon: LucideIcon;
  color: string;
  image: ImageSource;
};

// Photos: Pexels (free to use), cropped to 3:2 in assets/images/home.
const ACTIONS: QuickAction[] = [
  {
    id: 'ask-ekaay',
    label: 'Ask Ekaay',
    caption: 'Answers from your own records',
    icon: Sparkles,
    color: Colors.primary,
    image: require('@/assets/images/home/ask-ekaay.jpg'),
  },
  {
    id: 'video-consult',
    label: 'Video consult',
    caption: 'A doctor, with your history open',
    icon: Video,
    color: Colors.inkMid,
    image: require('@/assets/images/home/video-consult.jpg'),
  },
  {
    id: 'book-pod',
    label: 'Book a pod',
    caption: 'Screening near you, results in minutes',
    icon: MapPin,
    color: Colors.primary,
    image: require('@/assets/images/home/book-pod.jpg'),
  },
  {
    id: 'add-records',
    label: 'Add records',
    caption: 'Photo, PDF or WhatsApp',
    icon: Upload,
    color: Colors.success,
    image: require('@/assets/images/home/add-records.jpg'),
  },
];

const IMAGE_HEIGHT = 92;
const BADGE = 36;

export function QuickActions({ onPress }: { onPress: (id: QuickActionId) => void }) {
  return (
    <View style={styles.grid}>
      {ACTIONS.map(({ id, label, caption, icon: Icon, color, image }) => (
        <Pressable
          key={id}
          onPress={() => onPress(id)}
          accessibilityRole="button"
          accessibilityLabel={`${label}. ${caption}`}
          style={({ pressed }) => [styles.tile, pressed && styles.pressed]}>
          <View style={styles.media}>
            <Image source={image} style={StyleSheet.absoluteFill} contentFit="cover" />
            <LinearGradient
              colors={['rgba(14, 42, 51, 0)', 'rgba(14, 42, 51, 0.28)']}
              style={StyleSheet.absoluteFill}
            />
          </View>

          <View style={styles.badge}>
            <Icon size={18} color={color} strokeWidth={2.2} />
          </View>

          <View style={styles.body}>
            <ThemedText type="smallBold" numberOfLines={1}>
              {label}
            </ThemedText>
            <ThemedText type="caption" themeColor="textSecondary" numberOfLines={2}>
              {caption}
            </ThemedText>
          </View>
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
    overflow: 'hidden',
    borderRadius: Radius.lg + 2,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
    boxShadow: Shadows.card,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  media: {
    height: IMAGE_HEIGHT,
    backgroundColor: Colors.backgroundSelected,
  },
  // White disc straddling the photo's bottom edge.
  badge: {
    position: 'absolute',
    top: IMAGE_HEIGHT - BADGE / 2,
    left: 12,
    width: BADGE,
    height: BADGE,
    borderRadius: BADGE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundElement,
    boxShadow: Shadows.floating,
  },
  body: {
    gap: 2,
    paddingTop: BADGE / 2 + 6,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
});
