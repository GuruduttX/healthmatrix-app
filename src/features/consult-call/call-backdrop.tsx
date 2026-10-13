import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';

import { Colors } from '@/constants/theme';

/**
 * The dark stage behind the call while no video shows (connecting, or the doctor's camera off):
 * ink deepening to teal. The only dark screen in the app; the waiting room and the notes around
 * the call are on the warm page. Place it first inside a full-screen View.
 */
export function CallBackdrop() {
  return (
    <LinearGradient
      colors={[Colors.inkDeep, Colors.ink, Colors.teal]}
      locations={[0, 0.55, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.6, y: 1 }}
      style={[StyleSheet.absoluteFill, styles.noTouch]}
    />
  );
}

const styles = StyleSheet.create({
  noTouch: {
    pointerEvents: 'none',
  },
});
