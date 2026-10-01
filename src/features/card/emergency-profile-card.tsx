import { CircleCheck, EyeOff, Lock } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Surface } from '@/components/ui/surface';
import { Tag } from '@/components/ui/tag';
import { Colors, Spacing } from '@/constants/theme';

import { EMERGENCY_FIELDS, type EmergencyFieldId } from './sample-data';

type EmergencyProfileCardProps = {
  hidden: EmergencyFieldId[];
  onToggle: (id: EmergencyFieldId) => void;
};

/** Field-by-field control over what a stranger sees after scanning the QR. */
export function EmergencyProfileCard({ hidden, onToggle }: EmergencyProfileCardProps) {
  const shown = EMERGENCY_FIELDS.length - hidden.length;

  return (
    <Surface style={styles.card}>
      <View style={styles.header}>
        <ThemedText type="bodyBold" style={styles.title}>
          Emergency profile
        </ThemedText>
        <Tag label={`${shown} of ${EMERGENCY_FIELDS.length} shown`} tone="success" />
      </View>
      <ThemedText type="caption" themeColor="textSecondary">
        Tap a field to show or hide it from anyone who scans your code.
      </ThemedText>

      <View style={styles.grid}>
        {EMERGENCY_FIELDS.map((field) => {
          const isHidden = hidden.includes(field.id);
          return (
            <Pressable
              key={field.id}
              onPress={() => onToggle(field.id)}
              accessibilityRole="switch"
              accessibilityState={{ checked: !isHidden }}
              accessibilityLabel={field.label}
              style={({ pressed }) => [styles.field, pressed && styles.pressed]}>
              {isHidden ? (
                <EyeOff size={16} color={Colors.textMuted} strokeWidth={2} />
              ) : (
                <CircleCheck size={16} color={Colors.success} strokeWidth={2.2} />
              )}
              <ThemedText type="small" themeColor={isHidden ? 'textMuted' : 'text'} numberOfLines={1}>
                {field.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.note}>
        <Lock size={13} color={Colors.textSecondary} strokeWidth={2.2} />
        <ThemedText type="caption" themeColor="textSecondary">
          Full records open only with your OTP
        </ThemedText>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  title: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  field: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
  },
  pressed: {
    opacity: 0.6,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});
