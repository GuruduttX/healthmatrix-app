import { router } from 'expo-router';
import { ChevronRight, ShieldCheck, UserPlus, Users } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { SectionHeader } from '@/components/ui/section-header';
import { SkeletonList } from '@/components/ui/skeleton';
import { Surface } from '@/components/ui/surface';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { MemberAvatar } from '@/features/profile/member-avatar';

import { confirmRemove } from './confirm';
import { aboutLine, relationLabel } from './relations';
import { type FamilyMember, type FamilyViewer } from './types';
import { useFamily } from './use-family';

const openAdd = () => router.push('/family/add');

function MemberRow({ member, first }: { member: FamilyMember; first: boolean }) {
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/family/[id]', params: { id: member.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${member.name}, ${aboutLine(member)}. Open their records.`}
      style={({ pressed }) => [styles.row, !first && styles.divider, pressed && styles.pressed]}>
      <MemberAvatar name={member.name} photoUrl={member.photoUrl} size={44} />
      <View style={styles.flex}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {member.name}
        </ThemedText>
        <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
          {aboutLine(member)}
        </ThemedText>
      </View>
      <ChevronRight size={18} color={Colors.textMuted} strokeWidth={2.2} />
    </Pressable>
  );
}

/**
 * "Family" on the Card tab: the people the member added (each opens their records), a way to
 * add someone, and the people who added the member and so can see the member's records, with a
 * way to stop that.
 */
export function FamilySection() {
  const { members, viewers, error, refresh, removeLink } = useFamily();
  const [removing, setRemoving] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const revoke = async (viewer: FamilyViewer) => {
    const ok = await confirmRemove(
      `Stop ${viewer.name} seeing your records?`,
      `${viewer.name} added you as their ${relationLabel(viewer.relation, viewer.relationName).toLowerCase()}. They won’t see your prescriptions, reports or vaccines any more, unless you share a new code with them.`,
      'Stop sharing',
    );
    if (!ok) return;
    setRemoving(viewer.linkId);
    setRemoveError(null);
    try {
      await removeLink(viewer.linkId);
    } catch (e) {
      setRemoveError(e instanceof Error ? e.message : 'Could not remove that. Try again.');
    } finally {
      setRemoving(null);
    }
  };

  return (
    <View style={styles.section}>
      <SectionHeader
        title="Family"
        actionLabel={members?.length ? 'Add' : undefined}
        onAction={openAdd}
      />

      {members === null ? (
        error ? (
          <ErrorState title="Couldn’t load your family" message={error} onRetry={refresh} />
        ) : (
          <SkeletonList rows={2} label="Loading your family" />
        )
      ) : members.length ? (
        <Surface style={styles.card}>
          {members.map((member, index) => (
            <MemberRow key={member.linkId} member={member} first={index === 0} />
          ))}
        </Surface>
      ) : (
        <EmptyState
          icon={Users}
          title="Your family’s health, in one place"
          body="Add a parent, spouse or child. We text them a code to confirm, then you can see their prescriptions, reports, vaccines and medicines."
          action={{ label: 'Add family member', icon: UserPlus, onPress: openAdd }}
        />
      )}

      {viewers?.length ? (
        <View style={styles.viewers}>
          <View style={styles.viewersHeader}>
            <ShieldCheck size={15} color={Colors.success} strokeWidth={2.4} />
            <ThemedText type="smallBold" themeColor="textSecondary">
              Who can see your records
            </ThemedText>
          </View>
          <Surface style={styles.card}>
            {viewers.map((viewer, index) => (
              <View key={viewer.linkId} style={[styles.row, index > 0 && styles.divider]}>
                <MemberAvatar name={viewer.name} photoUrl={viewer.photoUrl} size={36} />
                <View style={styles.flex}>
                  <ThemedText type="smallBold" numberOfLines={1}>
                    {viewer.name}
                  </ThemedText>
                  <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
                    Added you as their{' '}
                    {relationLabel(viewer.relation, viewer.relationName).toLowerCase()}
                  </ThemedText>
                </View>
                <Pressable
                  onPress={() => revoke(viewer)}
                  disabled={removing === viewer.linkId}
                  accessibilityRole="button"
                  accessibilityLabel={`Stop ${viewer.name} seeing your records`}
                  hitSlop={8}
                  style={({ pressed }) => [styles.remove, pressed && styles.pressed]}>
                  {removing === viewer.linkId ? (
                    <ActivityIndicator size="small" color={Colors.danger} />
                  ) : (
                    <ThemedText type="caption" themeColor="danger" style={styles.bold}>
                      Remove
                    </ThemedText>
                  )}
                </Pressable>
              </View>
            ))}
          </Surface>
          {removeError ? (
            <ThemedText type="caption" themeColor="danger">
              {removeError}
            </ThemedText>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two + 2,
  },
  flex: {
    flex: 1,
  },
  card: {
    paddingVertical: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 4,
    paddingVertical: 12,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  viewers: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  viewersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  remove: {
    minWidth: 64,
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.dangerSoft,
  },
  bold: {
    fontFamily: Fonts.bold,
  },
  pressed: {
    opacity: 0.7,
  },
});
