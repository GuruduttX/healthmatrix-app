import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';

const MIN_VISIBLE_MS = 1500;
const FADE_MS = 300;

/**
 * In-app splash with the logo and app name. Takes over from the native splash
 * (which can only show an image) and fades out once the app is ready.
 */
export function BrandSplash({ ready }: { ready: boolean }) {
  const [opacity] = useState(() => new Animated.Value(1));
  const [logoReady, setLogoReady] = useState(false);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [finished, setFinished] = useState(false);

  // The logo image loads a moment after the text can render. Keep the native
  // splash up and the content hidden until it is ready, so both appear together.
  useEffect(() => {
    if (!logoReady) return;
    SplashScreen.hide();
    const timer = setTimeout(() => setMinTimeElapsed(true), MIN_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [logoReady]);

  useEffect(() => {
    if (!ready || !minTimeElapsed) return;
    Animated.timing(opacity, {
      toValue: 0,
      duration: FADE_MS,
      useNativeDriver: Platform.OS !== 'web',
    }).start(() => setFinished(true));
  }, [ready, minTimeElapsed, opacity]);

  if (finished) return null;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.container, { opacity }]}>
      <View style={[styles.content, !logoReady && styles.hidden]}>
        <Image
          source={require('@/assets/images/logo-mark.png')}
          style={styles.logo}
          contentFit="contain"
          priority="high"
          onLoad={() => setLogoReady(true)}
          onError={() => setLogoReady(true)}
        />
        <ThemedText type="title">HealthMatrix</ThemedText>
        <ThemedText themeColor="textSecondary">Your whole health, in one card.</ThemedText>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  content: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  hidden: {
    opacity: 0,
  },
  logo: {
    width: 112,
    height: 100,
    marginBottom: Spacing.three,
  },
});
