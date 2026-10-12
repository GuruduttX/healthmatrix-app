import { Check, EyeOff, Lock, Pencil, Plus, ShieldPlus } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/empty-state';
import { IconTile } from '@/components/ui/icon-tile';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { Surface } from '@/components/ui/surface';
import { Tag } from '@/components/ui/tag';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

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
  /** Loads it again after an error. */
  onRetry?: () => void;
};

const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Shorter names where the full one would not fit half the card's width. */
const SHORT_LABELS: Partial<Record<EmergencyFieldId, string>> = {
  emergencyContacts: 'Contacts',
};

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

/** The card's shape while the profile loads. */
function ProfileSkeleton() {
  return (
    <SkeletonGroup label="Loading your emergency profile">
      <Surface style={styles.card}>
        <View style={styles.header}>
          <Skeleton width={40} height={40} radius={Radius.md} />
          <View style={styles.flex}>
            <Skeleton width="55%" height={15} />
            <Skeleton width="40%" height={11} style={styles.gap} />
          </View>
        </View>
        <Skeleton height={48} radius={Radius.pill} />
        <View style={styles.grid}>
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Skeleton key={i} height={38} radius={Radius.md} style={styles.cellSkeleton} />
          ))}
        </View>
      </Surface>
    </SkeletonGroup>
  );
}

/** The member's emergency details, and field-by-field control over what a QR scan shows. */
export function EmergencyProfileCard({
  profile,
  error,
  onToggle,
  onEdit,
  onRetry,
}: EmergencyProfileCardProps) {
  if (!profile) {
    return error ? (
      <ErrorState title="Couldn’t load your emergency profile" message={error} onRetry={onRetry} />
    ) : (
      <ProfileSkeleton />
    );
  }

  const empty = isEmpty(profile);
  const shown = profile.visibleFields.length;

  return (
    <Surface style={styles.card}>
      <View style={styles.header}>
        <IconTile icon={ShieldPlus} tone="danger" size={40} />
        <View style={styles.flex}>
          <ThemedText type="bodyBold">Emergency profile</ThemedText>
          <ThemedText type="caption" themeColor="textSecondary" numberOfLines={2}>
            {empty ? 'Nothing added yet' : summary(profile)}
          </ThemedText>
        </View>
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
      ) : null}

      <Button
        label={empty ? 'Add emergency details' : 'Edit emergency details'}
        variant={empty ? 'primary' : 'secondary'}
        icon={empty ? Plus : Pencil}
        onPress={onEdit}
      />

      <ThemedText type="caption" themeColor="textSecondary">
        Shown when someone scans your QR. Tap to show or hide.
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
              style={({ pressed }) => [
                styles.cell,
                isHidden ? styles.cellHidden : styles.cellShown,
                pressed && styles.pressed,
              ]}>
              <View style={[styles.cellIcon, isHidden ? styles.iconHidden : styles.iconShown]}>
                {isHidden ? (
                  <EyeOff size={11} color={Colors.textMuted} strokeWidth={2.6} />
                ) : (
                  <Check size={11} color={Colors.onInk} strokeWidth={3} />
                )}
              </View>
              <ThemedText
                style={[styles.cellText, { color: isHidden ? Colors.textMuted : Colors.text }]}
                numberOfLines={1}>
                {SHORT_LABELS[field.id] ?? field.label}
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
    gap: Spacing.three - 4,
  },
  flex: {
    flex: 1,
  },
  gap: {
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
  },
  nudge: {
    padding: Spacing.two + 4,
    borderRadius: Radius.md,
    backgroundColor: Colors.primarySoft,
  },
  // Two toggles to a row: grow from a 40% basis so the gap never forces a wrap.
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  cell: {
    flexGrow: 1,
    flexBasis: '40%',
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 38,
    paddingHorizontal: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  cellSkeleton: {
    flexGrow: 1,
    flexBasis: '40%',
  },
  cellShown: {
    borderColor: 'rgba(16, 128, 109, 0.16)',
    backgroundColor: Colors.successSoft,
  },
  cellHidden: {
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  cellIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconShown: {
    backgroundColor: Colors.success,
  },
  iconHidden: {
    backgroundColor: Colors.backgroundSelected,
  },
  cellText: {
    flexShrink: 1,
    fontFamily: Fonts.semibold,
    fontSize: 13,
    lineHeight: 17,
  },
  pressed: {
    opacity: 0.6,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: Spacing.three - 4,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});
