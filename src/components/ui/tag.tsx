import { type LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Fonts, Radius } from '@/constants/theme';

import { TONES, type Tone } from './icon-tile';

type TagProps = {
  label: string;
  tone?: Tone;
  icon?: LucideIcon;
};

/** Small coloured label, e.g. "2 need attention". Status tones always carry their word. */
export function Tag({ label, tone = 'neutral', icon: Icon }: TagProps) {
  const { color, soft } = TONES[tone];

  return (
    <View style={[styles.tag, { backgroundColor: soft }]}>
      {Icon ? <Icon size={12} color={color} strokeWidth={2.4} /> : null}
      <ThemedText style={[styles.label, { color }]} numberOfLines={1}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 3,
    paddingVertical: 2.5,
    paddingHorizontal: 8,
    borderRadius: Radius.pill,
  },
  label: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    lineHeight: 14,
  },
});
