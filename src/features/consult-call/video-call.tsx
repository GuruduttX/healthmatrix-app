import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';

import { type VideoCallProps } from './video-call-types';

/**
 * The web build has no Twilio Video SDK; calls run in the iOS and Android apps
 * (`video-call.native.tsx`).
 */
export function VideoCall({ doctorName }: VideoCallProps) {
  return (
    <View style={styles.root}>
      <ThemedText type="subtitle" style={styles.text}>
        {doctorName} is ready for you
      </ThemedText>
      <ThemedText type="small" style={styles.muted}>
        Video consults run in the HealthMatrix app. Open it on your phone to join.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
    backgroundColor: Colors.ink,
  },
  text: {
    color: Colors.onInk,
    textAlign: 'center',
  },
  muted: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
});
