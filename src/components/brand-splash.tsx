import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { LogoMark } from '@/components/ui/logo-mark';
import { MorningLight } from '@/components/ui/morning-light';
import { Colors, Fonts, Shadows, Spacing } from '@/constants/theme';

const MIN_VISIBLE_MS = 1500;
const FADE_MS = 300;
const LOGO = 96;

/**
 * In-app splash with the logo and app name, on the warm page in the morning light, as sign-in and
 * Home open. Takes over from the native splash (which can only show an image) and fades out once
 * the app is ready.
 */
export function BrandSplash({ ready }: { ready: boolean }) {
  const [opacity] = useState(() => new Animated.Value(1));
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [finished, setFinished] = useState(false);

  // The mark is drawn, not loaded, so it shows with the first frame: hand over from the native
  // splash straight away.
  useEffect(() => {
    SplashScreen.hide();
    const timer = setTimeout(() => setMinTimeElapsed(true), MIN_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, []);

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
      <MorningLight height={520} />
      <View style={styles.content}>
        {/* The shadow sits on its own wrapper, outside the tile's rounded clip. */}
        <View style={styles.logoShadow}>
          <View style={styles.logoTile}>
            <LogoMark size={LOGO} scale={0.6} />
          </View>
        </View>
        <ThemedText style={styles.brand}>HealthMatrix</ThemedText>
        <ThemedText style={styles.tagline}>Your whole health, in one card.</ThemedText>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.canvas,
  },
  content: {
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.four,
  },
  logoShadow: {
    marginBottom: Spacing.four - 4,
    borderRadius: 30,
    boxShadow: Shadows.raised,
  },
  // The app icon: a white tile with the petals in the brand's three oranges.
  logoTile: {
    width: LOGO,
    height: LOGO,
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.hairline,
    backgroundColor: Colors.backgroundElement,
  },
  brand: {
    fontFamily: Fonts.display,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.6,
    color: Colors.text,
  },
  tagline: {
    textAlign: 'center',
    fontFamily: Fonts.medium,
    fontSize: 15,
    lineHeight: 21,
    color: Colors.textSoft,
  },
});
