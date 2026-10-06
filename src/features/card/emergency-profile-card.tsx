import { CircleCheck, EyeOff, Lock, Pencil, Plus } from 'lucide-react-native';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Surface } from '@/components/ui/surface';
import { Tag } from '@/components/ui/tag';
import { Colors, Radius, Spacing } from '@/constants/theme';

import {
  EMERGENCY_FIELDS,
  isEmpty,
  type EmergencyFieldId,
  type EmergencyProfile,
} from './emergency-profile';

type EmergencyProfileCardProps = {
  /** Null while it loads. */
  profile: EmergencyProfile | null;
  error?: string | null;
  onToggle: (id: EmergencyFieldId) => void;
  onEdit: () => void;
};

const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** "O+ · 1 allergy · 2 contacts" */
function summary(profile: EmergencyProfile) {
  return [
    profile.bloodGroup,
    profile.allergies.length ? count(profile.allergies.length, 'allergy', 'allergies') : null,
    profile.conditions.length ? count(profile.conditions.length, 'condition') : null,
    profile.medicines.length ? count(profile.medicines.length, 'medicine') : null,
    profile.emergencyContacts.length ? count(profile.emergencyContacts.length, 'contact') : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

/** The member's emergency details, and field-by-field control over what a QR scan shows. */
export function EmergencyProfileCard({ profile, error, onToggle, onEdit }: EmergencyProfileCardProps) {
  if (!profile) {
    return (
      <Surface style={[styles.card, styles.loading]}>
        {error ? (
          <ThemedText type="small" themeColor="danger">
            {error}
          </ThemedText>
        ) : (
          <ActivityIndicator color={Colors.textSecondary} />
        )}
      </Surface>
    );
  }

  const empty = isEmpty(profile);
  const shown = profile.visibleFields.length;

  return (
    <Surface style={styles.card}>
      <View style={styles.header}>
        <ThemedText type="bodyBold" style={styles.title}>
          Emergency profile
        </ThemedText>
        <Tag
          label={`${shown} of ${EMERGENCY_FIELDS.length} shown`}
          tone={shown ? 'success' : 'neutral'}
        />
      </View>

      {empty ? (
        <View style={styles.nudge}>
          <ThemedText type="small">
            Add your blood group, allergies and an emergency contact, so whoever scans your card
            knows how to help.
          </ThemedText>
        </View>
      ) : (
        <ThemedText type="smallBold">{summary(profile)}</ThemedText>
      )}

      <Button
        label={empty ? 'Add emergency details' : 'Edit emergency details'}
        variant={empty ? 'primary' : 'secondary'}
        icon={empty ? Plus : Pencil}
        onPress={onEdit}
      />

      <ThemedText type="caption" themeColor="textSecondary">
        Tap a field to show or hide it from anyone who scans your code.
      </ThemedText>

      <View style={styles.grid}>
        {EMERGENCY_FIELDS.map((field) => {
          const isHidden = !profile.visibleFields.includes(field.id);
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

      {error ? (
        <ThemedText type="caption" themeColor="danger" accessibilityLiveRegion="polite">
          {error}
        </ThemedText>
      ) : null}

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
  loading: {
    alignItems: 'center',
    paddingVertical: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  title: {
    flex: 1,
  },
  nudge: {
    padding: Spacing.two + 4,
    borderRadius: Radius.md,
    backgroundColor: Colors.primarySoft,
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
