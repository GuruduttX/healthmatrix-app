import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Gradients } from '@/constants/theme';
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
};

/** The member's photo, or their initials on the brand gradient when there is none. */
export function MemberAvatar({ name, photoUrl, localUri, size = 48 }: MemberAvatarProps) {
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

  return (
    // A plain View rounds and clips; the gradient is a layer, the initials one more above it.
    <View style={[round, styles.clip]}>
      <LinearGradient
        colors={Gradients.brand}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <ThemedText style={[styles.initials, { fontSize: size * 0.34, lineHeight: size * 0.42 }]}>
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
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontFamily: Fonts.bold,
    color: Colors.onInk,
  },
});
