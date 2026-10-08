import { router } from 'expo-router';
import { Eye, Share2 } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Surface } from '@/components/ui/surface';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-context';
import { useEmergencyProfile, type EmergencyFieldId } from '@/features/card/emergency-profile';
import { EmergencyProfileCard } from '@/features/card/emergency-profile-card';
import { MemberCard, type CardMember } from '@/features/card/member-card';
import { sampleCard } from '@/features/card/sample-data';
import { useEmergencyQr } from '@/features/card/use-emergency-qr';
import { type Member } from '@/types';

/** ISO date -> "09/26", as printed on the card. */
function cardDate(iso: string) {
  const date = new Date(iso);
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getFullYear()).slice(-2)}`;
}

function toCardMember(member: Member): CardMember {
  return {
    name: member.name,
    firstName: member.name.split(/\s+/)[0] ?? member.name,
    memberId: member.memberId,
    plan: member.plan,
    bloodGroup: member.bloodGroup,
    memberSince: cardDate(member.memberSince),
    validThru: member.validThru ? cardDate(member.validThru) : undefined,
    abhaLinked: member.abhaLinked,
  };
}

export default function CardScreen() {
  const { member, signOut, refreshMember } = useAuth();
  const { qr, error: qrError, refresh: refreshQr } = useEmergencyQr();
  const [lockScreenQr, setLockScreenQr] = useState(sampleCard.lockScreenQr);
  const { profile, error: profileError, refresh: refreshProfile, save } = useEmergencyProfile();
  const [toggleError, setToggleError] = useState<string | null>(null);

  const toggleField = (id: EmergencyFieldId) => {
    if (!profile) return;
    const visible = profile.visibleFields;
    setToggleError(null);
    save(
      { visibleFields: visible.includes(id) ? visible.filter((field) => field !== id) : [...visible, id] },
      { optimistic: true },
    ).catch((e: unknown) =>
      setToggleError(e instanceof Error ? e.message : 'Could not save that change. Try again.'),
    );
  };

  return (
    <Screen
      title="My card"
      onRefresh={() => Promise.allSettled([refreshMember(), refreshQr(), refreshProfile()])}
      headerRight={
        <Pressable accessibilityRole="button" style={styles.share}>
          <Share2 size={15} color={Colors.text} strokeWidth={2.2} />
          <ThemedText type="smallBold">Share</ThemedText>
        </Pressable>
      }>
      <View style={styles.sections}>
        {member ? (
          <MemberCard
            member={toCardMember(member)}
            emergencyUrl={qr?.url ?? null}
            emergencyError={qrError}
          />
        ) : null}

        <Surface style={styles.row}>
          <View style={styles.rowText}>
            <ThemedText type="bodyBold">Emergency QR on lock screen</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              Visible without unlocking your phone
            </ThemedText>
          </View>
          <Switch
            value={lockScreenQr}
            onValueChange={setLockScreenQr}
            trackColor={{ false: Colors.border, true: Colors.success }}
            thumbColor={Colors.backgroundElement}
          />
        </Surface>

        <EmergencyProfileCard
          profile={profile}
          error={toggleError ?? profileError}
          onToggle={toggleField}
          onEdit={() => router.push('/emergency-profile')}
        />

        <Button
          label="Preview what a responder sees"
          variant="secondary"
          icon={Eye}
          onPress={() => router.push('/responder-preview')}
        />

        <Surface style={styles.row}>
          <ThemedText type="bodyBold" style={styles.rowText}>
            Family cards
          </ThemedText>
          <View style={styles.avatars}>
            {sampleCard.family.map((person) => (
              <Avatar key={person.initials} initials={person.initials} color={person.color} size={34} />
            ))}
          </View>
        </Surface>

        <Pressable onPress={signOut} hitSlop={8} style={styles.signOut}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Sign out
          </ThemedText>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sections: {
    gap: Spacing.three - 4,
    marginTop: Spacing.two,
  },
  share: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: Radius.pill,
    backgroundColor: Colors.backgroundSelected,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 4,
  },
  rowText: {
    flex: 1,
  },
  avatars: {
    flexDirection: 'row',
    gap: 6,
  },
  signOut: {
    alignSelf: 'center',
    paddingVertical: Spacing.two,
  },
});
