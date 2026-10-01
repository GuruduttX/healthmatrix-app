import { Check } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ProgressRing } from '@/components/ui/progress-ring';
import { Surface } from '@/components/ui/surface';
import { Tag } from '@/components/ui/tag';
import { Colors, Spacing } from '@/constants/theme';

import { type Dose } from './sample-data';

type MedicinesCardProps = {
  person: string;
  doses: Dose[];
};

/** Today's doses for someone you look after. Tap a dose to mark it taken. */
export function MedicinesCard({ person, doses: initialDoses }: MedicinesCardProps) {
  const [doses, setDoses] = useState(initialDoses);
  const taken = doses.filter((dose) => dose.taken).length;
  const pending = doses.filter((dose) => !dose.taken);

  const toggle = (id: string) =>
    setDoses((current) =>
      current.map((dose) => (dose.id === id ? { ...dose, taken: !dose.taken } : dose)),
    );

  return (
    <Surface style={styles.card}>
      <View style={styles.header}>
        <ProgressRing value={taken} total={doses.length} />
        <View style={styles.flex}>
          <ThemedText type="bodyBold">{person}’s medicines</ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            {taken} of {doses.length} taken today
          </ThemedText>
        </View>
        {pending.length > 0 ? (
          <Tag label={`${pending.length} not marked`} tone="warning" />
        ) : (
          <Tag label="All taken" tone="success" />
        )}
      </View>

      {doses.map((dose) => (
        <Pressable
          key={dose.id}
          onPress={() => toggle(dose.id)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: dose.taken }}
          accessibilityLabel={`${dose.name}, ${dose.time}`}
          style={({ pressed }) => [styles.dose, pressed && styles.pressed]}>
          <View style={[styles.check, dose.taken && styles.checkDone]}>
            {dose.taken ? <Check size={14} color={Colors.onInk} strokeWidth={3} /> : null}
          </View>
          <ThemedText type="small" style={styles.flex} themeColor={dose.taken ? 'textSecondary' : 'text'}>
            {dose.name}
          </ThemedText>
          <ThemedText type="caption" themeColor="textMuted">
            {dose.time}
          </ThemedText>
        </Pressable>
      ))}
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.one,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 4,
    paddingBottom: Spacing.two,
  },
  dose: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 4,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  pressed: {
    opacity: 0.6,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  checkDone: {
    borderColor: Colors.success,
    backgroundColor: Colors.success,
  },
});
