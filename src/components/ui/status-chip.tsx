import { type LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { type ReadingFlag } from '@/types';

export const FLAG_STYLES: Record<ReadingFlag, { label: string; color: string; soft: string }> = {
  normal: { label: 'Normal', color: Colors.success, soft: Colors.successSoft },
  watch: { label: 'Watch', color: Colors.warning, soft: Colors.warningSoft },
  borderline: { label: 'Borderline', color: Colors.warning, soft: Colors.warningSoft },
  high: { label: 'High', color: Colors.danger, soft: Colors.dangerSoft },
  low: { label: 'Low', color: Colors.danger, soft: Colors.dangerSoft },
};

type StatusChipProps = {
  flag: ReadingFlag;
  /** Shown in place of the dot, e.g. the metric the flag belongs to. */
  icon?: LucideIcon;
};

export function StatusChip({ flag, icon: Icon }: StatusChipProps) {
  const { label, color, soft } = FLAG_STYLES[flag];

  return (
    <View style={[styles.chip, { backgroundColor: soft }]}>
      {Icon ? (
        <Icon size={12} color={color} strokeWidth={2.4} />
      ) : (
        <View style={[styles.dot, { backgroundColor: color }]} />
      )}
      <ThemedText style={[styles.label, { color }]}>{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: Radius.pill,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    lineHeight: 14,
  },
});
