import { LinearGradient } from 'expo-linear-gradient';
import { type LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { Colors, Gradients } from '@/constants/theme';

export type Tone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral';

/**
 * Each tone's ink and tint. Status tones are the colour-blind-safe reading flags (`good`, `watch`,
 * `high`), never the brand orange.
 */
export const TONES: Record<Tone, { color: string; soft: string }> = {
  primary: { color: Colors.primaryDeep, soft: Colors.primaryTint },
  success: { color: Colors.good, soft: Colors.goodSoft },
  warning: { color: Colors.watch, soft: Colors.watchSoft },
  danger: { color: Colors.high, soft: Colors.highSoft },
  neutral: { color: Colors.textSoft, soft: Colors.well },
};

type IconTileProps = {
  icon: LucideIcon;
  tone?: Tone;
  size?: number;
};

/**
 * An icon in a round dish, like the leads on Home's cards. Brand and neutral icons share Home's
 * quiet warm dish (never orange on peach); a status tone tints the dish with its flag colour.
 */
export function IconTile({ icon: Icon, tone = 'primary', size = 40 }: IconTileProps) {
  const { color, soft } = TONES[tone];
  const quiet = tone === 'primary' || tone === 'neutral';

  return (
    // A plain View rounds and clips; the tint is a layer, the icon one more above it.
    <View
      style={[
        styles.dish,
        { width: size, height: size, borderRadius: size / 2 },
        !quiet && { backgroundColor: soft },
      ]}>
      {quiet ? (
        <LinearGradient
          colors={Gradients.dishQuiet}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <Icon size={Math.round(size * 0.45)} color={color} strokeWidth={2.1} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dish: {
    overflow: 'hidden',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
