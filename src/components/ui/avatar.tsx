import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts } from '@/constants/theme';

type AvatarProps = {
  initials: string;
  color?: string;
  size?: number;
};

export function Avatar({ initials, color = Colors.inkMid, size = 40 }: AvatarProps) {
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
      ]}>
      <ThemedText style={[styles.initials, { fontSize: size * 0.34 }]}>{initials}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontFamily: Fonts.bold,
    color: Colors.onInk,
  },
});
