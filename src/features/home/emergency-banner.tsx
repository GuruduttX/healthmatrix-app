import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, QrCode } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing } from '@/constants/theme';

type EmergencyBannerProps = {
  isOn: boolean;
  carriers: string;
  onPress: () => void;
};

export function EmergencyBanner({ isOn, carriers, onPress }: EmergencyBannerProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => pressed && styles.pressed}>
      <LinearGradient
        colors={[Colors.ink, Colors.inkMid]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.banner}>
        <View style={styles.icon}>
          <QrCode size={22} color={Colors.primaryLight} strokeWidth={2} />
        </View>

        <View style={styles.text}>
          <View style={styles.titleRow}>
            <ThemedText type="smallBold" themeColor="onInk">
              Emergency QR is {isOn ? 'on' : 'off'}
            </ThemedText>
            <View style={[styles.statusDot, !isOn && styles.statusDotOff]} />
          </View>
          <ThemedText type="caption" style={styles.subtitle} numberOfLines={1}>
            {isOn ? carriers : 'Turn it on so responders can help you'}
          </ThemedText>
        </View>

        <ChevronRight size={20} color={Colors.onInk} strokeWidth={2} />
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.9,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
    padding: Spacing.three,
    borderRadius: Radius.xl - 4,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  text: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ADE80',
    boxShadow: '0 0 0 3px rgba(74, 222, 128, 0.25)',
  },
  statusDotOff: {
    backgroundColor: Colors.textMuted,
    boxShadow: 'none',
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
});
