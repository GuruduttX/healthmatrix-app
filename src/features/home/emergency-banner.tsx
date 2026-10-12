import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, QrCode } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

type EmergencyBannerProps = {
  isOn: boolean;
  carriers: string;
  onPress: () => void;
};

/** Brand green, lifted so it reads on ink. */
const ON_GREEN = '#4ADE80';

export function EmergencyBanner({ isOn, carriers, onPress }: EmergencyBannerProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Emergency QR is ${isOn ? 'on' : 'off'}. ${isOn ? carriers : 'Turn it on so responders can help you'}`}
      style={({ pressed }) => pressed && styles.pressed}>
      {/* A plain View rounds and clips; the gradient is a layer inside it. */}
      <View style={styles.banner}>
        <LinearGradient
          colors={[Colors.inkDeep, Colors.ink, Colors.inkMid]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Soft rings, like a signal going out from the card. */}
        <Svg width={180} height={180} style={styles.rings} pointerEvents="none">
          {[36, 60, 84].map((r) => (
            <Circle key={r} cx={150} cy={30} r={r} stroke={Colors.onInk} strokeOpacity={0.06} strokeWidth={1.5} fill="none" />
          ))}
        </Svg>

        <View style={styles.qr}>
          <QrCode size={26} color={Colors.ink} strokeWidth={2} />
        </View>

        <View style={styles.text}>
          <View style={styles.titleRow}>
            <ThemedText type="bodyBold" themeColor="onInk">
              Emergency QR
            </ThemedText>
            <View style={[styles.status, !isOn && styles.statusOff]}>
              <View style={[styles.statusDot, !isOn && styles.statusDotOff]} />
              <ThemedText style={[styles.statusText, !isOn && styles.statusTextOff]}>
                {isOn ? 'On' : 'Off'}
              </ThemedText>
            </View>
          </View>
          <ThemedText type="caption" style={styles.subtitle} numberOfLines={2}>
            {isOn ? carriers : 'Turn it on so responders can help you'}
          </ThemedText>
        </View>

        <View style={styles.chevron}>
          <ChevronRight size={18} color={Colors.onInk} strokeWidth={2.2} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 2,
    padding: Spacing.three,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    backgroundColor: Colors.ink,
  },
  rings: {
    position: 'absolute',
    top: -30,
    right: -40,
  },
  qr: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.onInk,
    boxShadow: '0 6px 16px rgba(0, 0, 0, 0.25)',
  },
  text: {
    flex: 1,
    gap: 3,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(74, 222, 128, 0.14)',
  },
  statusOff: {
    backgroundColor: Colors.glass,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: ON_GREEN,
  },
  statusDotOff: {
    backgroundColor: Colors.textMuted,
  },
  statusText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    lineHeight: 14,
    color: ON_GREEN,
  },
  statusTextOff: {
    color: Colors.onInkMuted,
  },
  subtitle: {
    color: Colors.onInkMuted,
  },
  chevron: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    backgroundColor: Colors.glass,
  },
});
