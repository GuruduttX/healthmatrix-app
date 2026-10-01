import { type LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { Colors, Radius } from '@/constants/theme';

export type Tone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral';

export const TONES: Record<Tone, { color: string; soft: string }> = {
  primary: { color: Colors.primary, soft: Colors.primarySoft },
  success: { color: Colors.success, soft: Colors.successSoft },
  warning: { color: Colors.warning, soft: Colors.warningSoft },
  danger: { color: Colors.danger, soft: Colors.dangerSoft },
  neutral: { color: Colors.inkMid, soft: Colors.backgroundSelected },
};

type IconTileProps = {
  icon: LucideIcon;
  tone?: Tone;
  size?: number;
};

/** Icon on a soft tinted rounded square. */
export function IconTile({ icon: Icon, tone = 'primary', size = 40 }: IconTileProps) {
  const { color, soft } = TONES[tone];

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: Radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: soft,
      }}>
      <Icon size={size / 2} color={color} strokeWidth={2} />
    </View>
  );
}
