import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Glass, Gradients } from '@/constants/theme';
import { apiUrl } from '@/services/api';

/** First letters of the first and last words: "Rohan Sharma" -> "RS". */
export function initialsOf(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? '';
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

type MemberAvatarProps = {
  name: string;
  /** The member's `photoUrl` from the API. */
  photoUrl?: string;
  /** A local file to show instead, e.g. a photo picked but not saved yet. */
  localUri?: string;
  size?: number;
  /**
   * Without a photo: `brand` puts white initials on the orange gradient; `glass` puts them on a
   * round of frosted glass tinted sky blue or apricot (picked from the name, so it stays put).
   */
  tone?: 'brand' | 'glass';
};

/** The glass tones: the frost, and initials dark enough to read on it. */
const GLASS_TONES = [
  { frost: ['rgba(175, 214, 240, 0.8)', 'rgba(255, 255, 255, 0.55)'], ink: '#1D5573' },
  { frost: ['rgba(255, 190, 148, 0.75)', 'rgba(255, 255, 255, 0.55)'], ink: Colors.primaryInk },
] as const;

function toneOf(name: string) {
  let sum = 0;
  for (const char of name) sum += char.charCodeAt(0);
  return GLASS_TONES[sum % GLASS_TONES.length] ?? GLASS_TONES[0];
}

/** The member's photo, or their initials when there is none. */
export function MemberAvatar({
  name,
  photoUrl,
  localUri,
  size = 48,
  tone = 'brand',
}: MemberAvatarProps) {
  const round = { width: size, height: size, borderRadius: size / 2 };
  const uri = localUri ?? (photoUrl ? apiUrl(photoUrl) : undefined);

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[round, styles.photo]}
        contentFit="cover"
        transition={150}
        accessibilityLabel={`Photo of ${name}`}
      />
    );
  }

  const glass = tone === 'glass' ? toneOf(name) : null;

  return (
    // A plain View rounds and clips; the gradient is a layer, the initials one more above it.
    <View style={[round, styles.clip, glass && styles.glass]}>
      <LinearGradient
        colors={glass ? glass.frost : Gradients.brand}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <ThemedText
          style={[
            styles.initials,
            { fontSize: size * 0.34, lineHeight: size * 0.42 },
            glass && { color: glass.ink },
          ]}>
          {initialsOf(name)}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  photo: {
    backgroundColor: Colors.well,
  },
  clip: {
    overflow: 'hidden',
  },
  glass: {
    borderWidth: 1,
    borderColor: Glass.rim,
    boxShadow: Glass.glowSmall,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontFamily: Fonts.bold,
    color: Colors.onInk,
  },
});
