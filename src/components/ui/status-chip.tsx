import { ArrowDown, ArrowUp, Check, Eye, type LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { type ReadingFlag } from '@/types';

/** Each flag's word, icon and colours, as on Home's vitals: the word first, never colour alone. */
export const FLAG_STYLES: Record<
  ReadingFlag,
  { label: string; icon: LucideIcon; color: string; soft: string }
> = {
  normal: { label: 'Normal', icon: Check, color: Colors.good, soft: Colors.goodSoft },
  watch: { label: 'Watch', icon: Eye, color: Colors.watch, soft: Colors.watchSoft },
  borderline: { label: 'Borderline', icon: Eye, color: Colors.watch, soft: Colors.watchSoft },
  high: { label: 'High', icon: ArrowUp, color: Colors.high, soft: Colors.highSoft },
  low: { label: 'Low', icon: ArrowDown, color: Colors.high, soft: Colors.highSoft },
};

type StatusChipProps = {
  flag: ReadingFlag;
  /** Shown in place of the flag's own icon, e.g. the metric the flag belongs to. */
  icon?: LucideIcon;
};

export function StatusChip({ flag, icon }: StatusChipProps) {
  const { label, color, soft, icon: FlagIcon } = FLAG_STYLES[flag];
  const Icon = icon ?? FlagIcon;

  return (
    <View style={[styles.chip, { backgroundColor: soft }]}>
      <Icon size={11} color={color} strokeWidth={2.8} />
      <ThemedText style={[styles.label, { color }]}>{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 3,
    paddingVertical: 2.5,
    paddingLeft: 6,
    paddingRight: 8,
    borderRadius: Radius.pill,
  },
  label: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    lineHeight: 14,
  },
});
