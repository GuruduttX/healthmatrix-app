import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Gradients } from '@/constants/theme';

/** "Dr Atul Mishra" -> "AM" */
function initials(name: string) {
  const words = name
    .replace(/^dr\.?\s+/i, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const first = words[0]?.[0] ?? '';
  const last = words.length > 1 ? (words.at(-1)?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

type DoctorAvatarProps = { name: string; photoUrl?: string; size?: number };

/** The doctor's photo when their profile has one, otherwise initials on the ink gradient. */
export function DoctorAvatar({ name, photoUrl, size = 56 }: DoctorAvatarProps) {
  const round = { width: size, height: size, borderRadius: size / 2 };

  if (photoUrl && /^https?:\/\//.test(photoUrl)) {
    return (
      <Image
        source={{ uri: photoUrl }}
        style={round}
        contentFit="cover"
        accessibilityIgnoresInvertColors
      />
    );
  }

  return (
    <LinearGradient
      colors={Gradients.dish}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[round, styles.center]}>
      <ThemedText style={[styles.initials, { fontSize: size * 0.34, lineHeight: size * 0.42 }]}>
        {initials(name)}
      </ThemedText>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontFamily: Fonts.bold,
    color: Colors.primaryInk,
  },
});
