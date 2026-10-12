import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Plus, UserPlus } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Skeleton, SkeletonCircle, SkeletonGroup } from '@/components/ui/skeleton';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { aboutLine } from '@/features/family/relations';
import { useFamily } from '@/features/family/use-family';
import { MemberAvatar } from '@/features/profile/member-avatar';

import { HomeSection } from './home-section';

const AVATAR = 40;
const openAdd = () => router.push('/family/add');

/**
 * "Family" on Home: everyone the member added, one tap from their records, and a way to add
 * someone. Placeholder chips while it loads; hidden if it could not load.
 */
export function FamilyStrip({ index }: { index: number }) {
  const { members, error } = useFamily();
  if (members === null && error) return null;

  if (members === null) {
    return (
      <HomeSection title="Family" index={index}>
        <SkeletonGroup label="Loading your family" style={styles.skeletonStrip}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.skeletonChip}>
              <SkeletonCircle size={AVATAR} />
              <View style={styles.skeletonText}>
                <Skeleton width={56} height={12} />
                <Skeleton width={40} height={10} />
              </View>
            </View>
          ))}
        </SkeletonGroup>
      </HomeSection>
    );
  }

  if (!members.length) {
    return (
      <HomeSection title="Family" index={index}>
        <View style={styles.invite}>
          {/* Photo: Pexels (free to use), assets/images/home. */}
          <Image
            source={require('@/assets/images/home/ask-ekaay.jpg')}
            style={styles.invitePhoto}
            contentFit="cover"
            accessibilityIgnoresInvertColors
          />
          <View style={styles.inviteBody}>
            <ThemedText type="bodyBold">Your family’s health, in one place</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              Add a parent, spouse or child to see their prescriptions, vaccines and medicines.
            </ThemedText>
            <View style={styles.inviteAction}>
              <Button label="Add family" icon={UserPlus} onPress={openAdd} />
            </View>
          </View>
        </View>
      </HomeSection>
    );
  }

  return (
    <HomeSection
      title="Family"
      actionLabel="Manage"
      onAction={() => router.navigate('/card')}
      index={index}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroller}
        contentContainerStyle={styles.strip}>
        {members.map((member) => {
          const firstName = member.name.trim().split(/\s+/)[0] ?? member.name;
          // Only who they are: "Mother", without age or blood group.
          const relation = aboutLine({ ...member, age: undefined, bloodGroup: undefined });
          return (
            <Pressable
              key={member.linkId}
              onPress={() => router.push({ pathname: '/family/[id]', params: { id: member.id } })}
              accessibilityRole="button"
              accessibilityLabel={`${member.name}, ${relation}. Open their records.`}
              style={({ pressed }) => [styles.person, pressed && styles.pressed]}>
              <MemberAvatar name={member.name} photoUrl={member.photoUrl} size={AVATAR} />
              <View style={styles.personText}>
                <ThemedText type="smallBold" numberOfLines={1}>
                  {firstName}
                </ThemedText>
                <ThemedText type="caption" themeColor="textMuted" numberOfLines={1}>
                  {relation}
                </ThemedText>
              </View>
            </Pressable>
          );
        })}

        <Pressable
          onPress={openAdd}
          accessibilityRole="button"
          accessibilityLabel="Add a family member"
          style={({ pressed }) => [styles.person, styles.add, pressed && styles.pressed]}>
          <View style={styles.addCircle}>
            <Plus size={20} color={Colors.primary} strokeWidth={2.4} />
          </View>
          <ThemedText type="smallBold" themeColor="primary">
            Add
          </ThemedText>
        </Pressable>
      </ScrollView>
    </HomeSection>
  );
}

const styles = StyleSheet.create({
  // Let the strip run to the screen edges while its first avatar lines up with the page.
  scroller: {
    marginHorizontal: -Spacing.three,
  },
  strip: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  // A pill per person: photo or initials, then first name over who they are.
  person: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    maxWidth: 200,
    paddingVertical: 7,
    paddingLeft: 7,
    paddingRight: Spacing.three,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
    boxShadow: Shadows.card,
  },
  personText: {
    flexShrink: 1,
  },
  skeletonStrip: {
    flexDirection: 'row',
    gap: Spacing.two,
    overflow: 'hidden',
  },
  skeletonChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 7,
    paddingLeft: 7,
    paddingRight: Spacing.three,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
  },
  skeletonText: {
    gap: 6,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  add: {
    borderStyle: 'dashed',
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.primarySoft,
    boxShadow: 'none',
  },
  addCircle: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundElement,
  },
  invite: {
    flexDirection: 'row',
    overflow: 'hidden',
    borderRadius: Radius.xl - 4,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
    boxShadow: Shadows.card,
  },
  invitePhoto: {
    width: 112,
    backgroundColor: Colors.backgroundSelected,
  },
  inviteBody: {
    flex: 1,
    gap: 4,
    padding: 14,
  },
  inviteAction: {
    alignItems: 'flex-start',
    marginTop: Spacing.two,
  },
});
