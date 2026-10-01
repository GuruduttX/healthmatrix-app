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

export function StatusChip({ flag }: { flag: ReadingFlag }) {
  const { label, color, soft } = FLAG_STYLES[flag];

  return (
    <View style={[styles.chip, { backgroundColor: soft }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
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
