import { AlertCircle, Check, EyeOff, Lock, Pencil, Plus, ShieldPlus } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ErrorState } from '@/components/ui/empty-state';
import { IconTile } from '@/components/ui/icon-tile';
import { Skeleton, SkeletonCircle, SkeletonGroup } from '@/components/ui/skeleton';
import { Surface } from '@/components/ui/surface';
import { Colors, Fonts, Radius, Shadows, Spacing } from '@/constants/theme';

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

const LEAD = 40;
/** The card's side padding; the rules run through it to the edges. */
const PAD = Spacing.three - 2;

/** "2 contacts", kept on one line so the summary only breaks between items. */
const count = (n: number, one: string, many = `${one}s`) => `${n}\u00A0${n === 1 ? one : many}`;

/** Shorter names, so the pills stay short. */
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
          <SkeletonCircle size={LEAD} />
          <View style={[styles.flex, styles.skeletonText]}>
            <Skeleton width="55%" height={15} />
            <Skeleton width="75%" height={11} />
          </View>
          <Skeleton width={64} height={32} radius={Radius.pill} />
        </View>
        <View style={styles.rule} />
        <Skeleton width="62%" height={11} />
        <View style={styles.pills}>
          {[64, 96, 78, 88, 82, 76, 100, 84].map((width, i) => (
            <Skeleton key={i} width={width} height={34} radius={Radius.pill} />
          ))}
        </View>
      </Surface>
    </SkeletonGroup>
  );
}

/** One detail a scan can show: a white pill with a tick when shown, a quiet one when hidden. */
function FieldToggle({
  label,
  shown,
  onPress,
}: {
  label: string;
  shown: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="switch"
      accessibilityState={{ checked: shown }}
      accessibilityLabel={label}
      accessibilityHint="Shows or hides it when someone scans your QR"
      hitSlop={4}
      style={({ pressed }) => [
        styles.pill,
        shown ? styles.pillOn : styles.pillOff,
        pressed && styles.pillPressed,
      ]}>
      {shown ? (
        <Check size={13} color={Colors.good} strokeWidth={3} />
      ) : (
        <EyeOff size={13} color={Colors.textMuted} strokeWidth={2.4} />
      )}
      <ThemedText style={[styles.pillText, !shown && styles.pillTextOff]} numberOfLines={1}>
        {label}
      </ThemedText>
    </Pressable>
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
        <IconTile icon={ShieldPlus} size={LEAD} />
        <View style={styles.flex}>
          <ThemedText style={styles.title} accessibilityRole="header" numberOfLines={1}>
            Emergency profile
          </ThemedText>
          <ThemedText style={styles.subtitle} numberOfLines={2}>
            {empty ? 'Nothing added yet' : summary(profile)}
          </ThemedText>
        </View>
        {/* One small action at the top right: solid while there is nothing to show yet. */}
        <Pressable
          onPress={onEdit}
          accessibilityRole="button"
          accessibilityLabel={empty ? 'Add emergency details' : 'Edit emergency details'}
          hitSlop={8}
          style={({ pressed }) => [
            styles.action,
            empty ? styles.actionSolid : styles.actionSoft,
            pressed && (empty ? styles.actionSolidPressed : styles.actionSoftPressed),
          ]}>
          {empty ? (
            <Plus size={15} color={Colors.onInk} strokeWidth={2.6} />
          ) : (
            <Pencil size={13} color={Colors.primaryDeep} strokeWidth={2.4} />
          )}
          <ThemedText style={[styles.actionText, empty && styles.actionTextSolid]}>
            {empty ? 'Add' : 'Edit'}
          </ThemedText>
        </Pressable>
      </View>

      {empty ? (
        <ThemedText style={styles.nudge}>
          Add your blood group, allergies and an emergency contact, so whoever scans your card
          knows how to help.
        </ThemedText>
      ) : null}

      <View style={styles.rule} />

      <View style={styles.shownRow}>
        <ThemedText style={[styles.flex, styles.caption]} numberOfLines={1}>
          Shown when someone scans your QR
        </ThemedText>
        <ThemedText style={styles.meta}>
          {shown} of {EMERGENCY_FIELDS.length}
        </ThemedText>
      </View>

      <View style={styles.pills}>
        {EMERGENCY_FIELDS.map((field) => (
          <FieldToggle
            key={field.id}
            label={SHORT_LABELS[field.id] ?? field.label}
            shown={profile.visibleFields.includes(field.id)}
            onPress={() => onToggle(field.id)}
          />
        ))}
      </View>

      {error ? (
        <View style={styles.error} accessibilityLiveRegion="polite">
          <AlertCircle size={15} color={Colors.high} strokeWidth={2.4} />
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </View>
      ) : null}

      <View style={styles.rule} />

      <View style={styles.note}>
        <Lock size={13} color={Colors.textFaint} strokeWidth={2.2} />
        <ThemedText style={styles.noteText}>Full records open only with your OTP</ThemedText>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three - 4,
    paddingHorizontal: PAD,
    paddingVertical: PAD,
  },
  flex: {
    flex: 1,
  },
  skeletonText: {
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
  },
  title: {
    fontFamily: Fonts.displaySemibold,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.3,
    color: Colors.text,
  },
  subtitle: {
    marginTop: 1,
    fontFamily: Fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSoft,
  },
  nudge: {
    fontFamily: Fonts.medium,
    fontSize: 13.5,
    lineHeight: 19,
    color: Colors.textSoft,
  },
  // A hairline across the whole card, as under the header of Home's Today card.
  rule: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: -PAD,
    backgroundColor: Colors.hairline,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: Radius.pill,
  },
  // White, with a peach edge, like Home's add button.
  actionSoft: {
    borderWidth: 1,
    borderColor: Colors.primaryTintStrong,
    backgroundColor: Colors.backgroundElement,
    boxShadow: Shadows.soft,
  },
  actionSoftPressed: {
    backgroundColor: Colors.primaryTint,
    transform: [{ scale: 0.97 }],
  },
  actionSolid: {
    backgroundColor: Colors.primaryDeep,
  },
  actionSolidPressed: {
    backgroundColor: Colors.primaryInk,
    transform: [{ scale: 0.97 }],
  },
  actionText: {
    fontFamily: Fonts.bold,
    fontSize: 13.5,
    lineHeight: 18,
    color: Colors.primaryDeep,
  },
  actionTextSolid: {
    color: Colors.onInk,
  },
  shownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  caption: {
    fontFamily: Fonts.semibold,
    fontSize: 13,
    lineHeight: 17,
    color: Colors.textSoft,
  },
  meta: {
    fontFamily: Fonts.semibold,
    fontSize: 12.5,
    lineHeight: 17,
    color: Colors.textFaint,
    fontVariant: ['tabular-nums'],
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 34,
    paddingLeft: 9,
    paddingRight: 12,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  pillOn: {
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
  },
  pillOff: {
    borderColor: Colors.well,
    backgroundColor: Colors.well,
  },
  pillPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.97 }],
  },
  pillText: {
    flexShrink: 1,
    fontFamily: Fonts.bold,
    fontSize: 13,
    lineHeight: 17,
    color: Colors.text,
  },
  pillTextOff: {
    fontFamily: Fonts.semibold,
    color: Colors.textFaint,
  },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  errorText: {
    flex: 1,
    fontFamily: Fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.high,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: -2,
  },
  noteText: {
    fontFamily: Fonts.medium,
    fontSize: 12.5,
    lineHeight: 17,
    color: Colors.textFaint,
  },
});
