import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';

import { Colors } from '@/constants/theme';

/**
 * The background of the waiting room and the call's messages: ink deepening to teal. Place it
 * first inside a full-screen View.
 */
export function CallBackdrop() {
  return (
    <LinearGradient
      colors={[Colors.inkDeep, Colors.ink, Colors.teal]}
      locations={[0, 0.55, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.6, y: 1 }}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    />
  );
}
