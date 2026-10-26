import { LinearGradient } from 'expo-linear-gradient';
import { Plus } from 'lucide-react-native';
import { type Ref } from 'react';
import { StyleSheet, View, type ViewInstance } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts } from '@/constants/theme';

/** Everything is drawn for a 360-wide phone and scaled to the width it's given. */
const BASE = 360;

type LockScreenWallpaperProps = {
  /** The emergency page the QR opens. */
  url: string;
  width: number;
  /** The phone's height over its width, so the picture fills its lock screen. */
  ratio: number;
  ref?: Ref<ViewInstance>;
};

/**
 * The lock screen picture: the emergency QR on a white card, low enough to leave the clock clear,
 * on deep ink so a white clock stays readable. No name or details on it: anyone can see a lock
 * screen, and the QR opens only what the member chose to show responders.
 */
export function LockScreenWallpaperArt({ url, width, ratio, ref }: LockScreenWallpaperProps) {
  const k = width / BASE;
  const height = width * ratio;
  const qrSize = Math.round(196 * k);

  return (
    // Not flattened away on Android, so a capture of it has something to draw.
    <View ref={ref} collapsable={false} style={[styles.root, { width, height }]}>
      <LinearGradient
        colors={[Colors.ink, '#173F49']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Below the clock and date, above the lock screen's own buttons. */}
      <View style={[styles.stack, { top: height * 0.36, gap: 16 * k }]}>
        <View style={[styles.card, { padding: 18 * k, borderRadius: 26 * k, gap: 12 * k }]}>
          <View style={[styles.badge, { gap: 6 * k }]}>
            <View
              style={[
                styles.cross,
                { width: 20 * k, height: 20 * k, borderRadius: 10 * k },
              ]}>
              <Plus size={14 * k} color="#FFFFFF" strokeWidth={3.4} />
            </View>
            <ThemedText
              style={[styles.badgeText, { fontSize: 13 * k, lineHeight: 17 * k, letterSpacing: 1.4 * k }]}>
              EMERGENCY
            </ThemedText>
          </View>
          <QRCode value={url} size={qrSize} color="#000000" backgroundColor="#FFFFFF" ecl="M" />
          <ThemedText style={[styles.scan, { fontSize: 15 * k, lineHeight: 20 * k }]}>
            Scan for my medical details
          </ThemedText>
        </View>
        <ThemedText style={[styles.hint, { fontSize: 12.5 * k, lineHeight: 17 * k }]}>
          Any phone camera · no unlock needed
        </ThemedText>
      </View>
      <ThemedText
        style={[styles.brand, { bottom: height * 0.05, fontSize: 13 * k, lineHeight: 17 * k }]}>
        HealthMatrix
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
    backgroundColor: Colors.ink,
  },
  stack: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  card: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // A medical cross in the alert crimson, never the brand orange.
  cross: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.high,
  },
  badgeText: {
    fontFamily: Fonts.bold,
    color: Colors.high,
  },
  scan: {
    fontFamily: Fonts.bold,
    color: Colors.ink,
    textAlign: 'center',
  },
  hint: {
    fontFamily: Fonts.medium,
    color: 'rgba(255, 255, 255, 0.78)',
    textAlign: 'center',
  },
  brand: {
    position: 'absolute',
    left: 0,
    right: 0,
    fontFamily: Fonts.semibold,
    color: 'rgba(255, 255, 255, 0.55)',
    textAlign: 'center',
  },
});
