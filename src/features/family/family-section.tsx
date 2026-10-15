import { router } from 'expo-router';
import { ShieldCheck, UserPlus, Users } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { glassSurface } from '@/components/ui/glass';
import { Chevron, LIST_LEAD, ListCard, ListRow } from '@/components/ui/list';
import { Section } from '@/components/ui/section';
import { SkeletonList } from '@/components/ui/skeleton';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { MemberAvatar } from '@/features/profile/member-avatar';

import { confirmRemove } from './confirm';
import { aboutLine, relationLabel } from './relations';
import { type FamilyViewer } from './types';
import { useFamily } from './use-family';

const openAdd = () => router.push('/family/add');

/**
 * "Family" on the Card tab: the people the member added (each opens their records), a way to
 * add someone, and the people who added the member and so can see the member's records, with a
 * way to stop that.
 */
export function FamilySection({ index }: { index?: number } = {}) {
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
    <Section
      title="Family"
      actionLabel={members?.length ? 'Add' : undefined}
      onAction={openAdd}
      index={index}>
      {members === null ? (
        error ? (
          <ErrorState title="Couldn’t load your family" message={error} onRetry={refresh} />
        ) : (
          <SkeletonList rows={2} label="Loading your family" />
        )
      ) : members.length ? (
        <ListCard>
          {members.map((member) => (
            <ListRow
              key={member.linkId}
              leading={
                <MemberAvatar
                  name={member.name}
                  photoUrl={member.photoUrl}
                  size={LIST_LEAD}
                  tone="glass"
                />
              }
              title={member.name}
              subtitle={aboutLine(member)}
              trailing={<Chevron />}
              onPress={() => router.push({ pathname: '/family/[id]', params: { id: member.id } })}
              accessibilityLabel={`${member.name}, ${aboutLine(member)}. Open their records.`}
            />
          ))}
        </ListCard>
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
            <ShieldCheck size={15} color={Colors.good} strokeWidth={2.4} />
            <ThemedText style={styles.viewersTitle} accessibilityRole="header">
              Who can see your records
            </ThemedText>
          </View>
          <ListCard>
            {viewers.map((viewer) => (
              <ListRow
                key={viewer.linkId}
                leading={
                  <MemberAvatar
                    name={viewer.name}
                    photoUrl={viewer.photoUrl}
                    size={LIST_LEAD}
                    tone="glass"
                  />
                }
                title={viewer.name}
                subtitle={`Added you as their ${relationLabel(viewer.relation, viewer.relationName).toLowerCase()}`}
                trailing={
                  <Pressable
                    onPress={() => revoke(viewer)}
                    disabled={removing === viewer.linkId}
                    accessibilityRole="button"
                    accessibilityLabel={`Stop ${viewer.name} seeing your records`}
                    hitSlop={8}
                    style={({ pressed }) => [
                      glassSurface.flat,
                      styles.remove,
                      pressed && styles.removePressed,
                    ]}>
                    {removing === viewer.linkId ? (
                      <ActivityIndicator size="small" color={Colors.high} />
                    ) : (
                      <ThemedText style={styles.removeText}>Remove</ThemedText>
                    )}
                  </Pressable>
                }
              />
            ))}
          </ListCard>
          {removeError ? (
            <ThemedText style={styles.error} accessibilityLiveRegion="polite">
              {removeError}
            </ThemedText>
          ) : null}
        </View>
      ) : null}
    </Section>
  );
}

const styles = StyleSheet.create({
  viewers: {
    gap: Spacing.two + 2,
    marginTop: Spacing.two,
  },
  viewersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewersTitle: {
    fontFamily: Fonts.semibold,
    fontSize: 13.5,
    lineHeight: 18,
    color: Colors.textSoft,
  },
  // A small pill of glass with crimson words: removing, never orange.
  remove: {
    minWidth: 76,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: Radius.pill,
  },
  removePressed: {
    backgroundColor: Colors.highSoft,
    transform: [{ scale: 0.97 }],
  },
  removeText: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    lineHeight: 17,
    color: Colors.high,
  },
  error: {
    fontFamily: Fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.high,
  },
});
