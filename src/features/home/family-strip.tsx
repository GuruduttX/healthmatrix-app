import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Plus, UserPlus } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Glass } from '@/components/ui/glass';
import { Section } from '@/components/ui/section';
import { Skeleton, SkeletonCircle, SkeletonGroup } from '@/components/ui/skeleton';
import { Colors, Fonts, Glass as GlassTokens, Radius, Spacing } from '@/constants/theme';
import { aboutLine } from '@/features/family/relations';
import { useFamily } from '@/features/family/use-family';
import { MemberAvatar } from '@/features/profile/member-avatar';

const AVATAR = 56;
const openAdd = () => router.push('/family/add');

/**
 * "Family" on Home: everyone the member added, one tap from their records, and a way to add
 * someone. Placeholder faces while it loads; hidden if it could not load.
 */
export function FamilyStrip({ index }: { index: number }) {
  const { members, error } = useFamily();
  if (members === null && error) return null;

  if (members === null) {
    return (
      <Section title="Family" index={index}>
        <Glass>
          <SkeletonGroup label="Loading your family" style={styles.strip}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={styles.person}>
                <SkeletonCircle size={AVATAR} />
                <Skeleton width={48} height={12} />
                <Skeleton width={36} height={10} />
              </View>
            ))}
          </SkeletonGroup>
        </Glass>
      </Section>
    );
  }

  if (!members.length) {
    return (
      <Section title="Family" index={index}>
        <Glass style={styles.invite}>
          {/* Photo: Pexels (free to use), assets/images/home. */}
          <Image
            source={require('@/assets/images/home/ask-ekaay.jpg')}
            style={styles.invitePhoto}
            contentFit="cover"
            accessibilityIgnoresInvertColors
          />
          <View style={styles.inviteBody}>
            <ThemedText style={styles.inviteTitle}>Your family’s health, in one place</ThemedText>
            <ThemedText style={styles.inviteText}>
              Add a parent, spouse or child to see their prescriptions, vaccines and medicines.
            </ThemedText>
            <Pressable
              onPress={openAdd}
              accessibilityRole="button"
              style={({ pressed }) => [styles.inviteButton, pressed && styles.inviteButtonPressed]}>
              <UserPlus size={16} color={Colors.onInk} strokeWidth={2.4} />
              <ThemedText style={styles.inviteButtonText}>Add family</ThemedText>
            </Pressable>
          </View>
        </Glass>
      </Section>
    );
  }

  return (
    <Section
      title="Family"
      actionLabel="Manage"
      onAction={() => router.navigate('/card')}
      index={index}>
      <Glass>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
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
                <View style={styles.ring}>
                  <MemberAvatar
                    name={member.name}
                    photoUrl={member.photoUrl}
                    size={AVATAR}
                    tone="glass"
                  />
                </View>
                <View style={styles.names}>
                  <ThemedText style={styles.name} numberOfLines={1}>
                    {firstName}
                  </ThemedText>
                  <ThemedText style={styles.relation} numberOfLines={1}>
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
            style={({ pressed }) => [styles.person, pressed && styles.pressed]}>
            <View style={styles.add}>
              <Plus size={22} color={Colors.primary} strokeWidth={2.4} />
            </View>
            <View style={styles.names}>
              <ThemedText style={[styles.name, styles.addLabel]}>Add</ThemedText>
              <ThemedText style={styles.relation}> </ThemedText>
            </View>
          </Pressable>
        </ScrollView>
      </Glass>
    </Section>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    gap: Spacing.two + 2,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three - 2,
  },
  person: {
    width: 72,
    alignItems: 'center',
    gap: 8,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.97 }],
  },
  // A ring of glass around each face.
  ring: {
    padding: 2,
    borderRadius: AVATAR / 2 + 3,
    borderWidth: 1,
    borderColor: GlassTokens.rim,
    backgroundColor: GlassTokens.fillSoft,
    boxShadow: `${GlassTokens.glowSmall}, ${GlassTokens.shadowSmall}`,
  },
  names: {
    alignItems: 'center',
    maxWidth: 72,
  },
  name: {
    fontFamily: Fonts.bold,
    fontSize: 13.5,
    lineHeight: 18,
    color: Colors.text,
  },
  relation: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textFaint,
  },
  add: {
    width: AVATAR + 6,
    height: AVATAR + 6,
    borderRadius: (AVATAR + 6) / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.primaryLight,
    backgroundColor: GlassTokens.fillSoft,
    boxShadow: GlassTokens.glowSmall,
  },
  addLabel: {
    color: Colors.primaryDeep,
  },
  invite: {
    flexDirection: 'row',
  },
  invitePhoto: {
    width: 116,
    backgroundColor: Colors.well,
  },
  inviteBody: {
    flex: 1,
    gap: 4,
    padding: Spacing.three - 2,
  },
  inviteTitle: {
    fontFamily: Fonts.bold,
    fontSize: 15.5,
    lineHeight: 21,
    color: Colors.text,
  },
  inviteText: {
    fontFamily: Fonts.regular,
    fontSize: 13.5,
    lineHeight: 19,
    color: Colors.textSoft,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    minHeight: 44,
    marginTop: Spacing.two,
    paddingHorizontal: 16,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primaryDeep,
  },
  inviteButtonPressed: {
    backgroundColor: Colors.primaryInk,
  },
  inviteButtonText: {
    fontFamily: Fonts.bold,
    fontSize: 14.5,
    lineHeight: 19,
    color: Colors.onInk,
  },
});
