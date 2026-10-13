import { router } from 'expo-router';
import { Eye, Share2, Smartphone } from 'lucide-react-native';
import { useState } from 'react';

import { Screen } from '@/components/screen';
import { IconTile } from '@/components/ui/icon-tile';
import { Chevron, ListCard, ListRow } from '@/components/ui/list';
import { Section } from '@/components/ui/section';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { HeaderIconButton } from '@/components/ui/stack-header';
import { Toggle } from '@/components/ui/toggle';
import { Colors, Radius } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-context';
import { useEmergencyProfile, type EmergencyFieldId } from '@/features/card/emergency-profile';
import { EmergencyProfileCard } from '@/features/card/emergency-profile-card';
import { MemberCard, type CardMember } from '@/features/card/member-card';
import { sampleCard } from '@/features/card/sample-data';
import { useEmergencyQr } from '@/features/card/use-emergency-qr';
import { FamilySection } from '@/features/family/family-section';
import { useFamily } from '@/features/family/use-family';
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
  const { member, refreshMember } = useAuth();
  const { qr, error: qrError, refresh: refreshQr } = useEmergencyQr();
  const [lockScreenQr, setLockScreenQr] = useState(sampleCard.lockScreenQr);
  const { profile, error: profileError, refresh: refreshProfile, save } = useEmergencyProfile();
  const [toggleError, setToggleError] = useState<string | null>(null);
  const { refresh: refreshFamily } = useFamily();

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
      hero
      title="My card"
      subtitle="Health ID, emergency QR and family"
      onRefresh={() =>
        Promise.allSettled([refreshMember(), refreshQr(), refreshProfile(), refreshFamily()])
      }
      headerRight={
        <HeaderIconButton
          icon={<Share2 size={16} color={Colors.text} strokeWidth={2.3} />}
          text="Share"
          label="Share your card"
        />
      }>
      <Section index={0}>
        {member ? (
          <MemberCard
            member={toCardMember(member)}
            emergencyUrl={qr?.url ?? null}
            emergencyError={qrError}
          />
        ) : (
          <SkeletonGroup label="Loading your card">
            <Skeleton height={210} radius={Radius.xl - 4} />
          </SkeletonGroup>
        )}
      </Section>

      <Section index={1}>
        <ListCard>
          <ListRow
            leading={<IconTile icon={Smartphone} tone="neutral" />}
            title="QR on lock screen"
            subtitle="Visible without unlocking"
            trailing={
              <Toggle
                value={lockScreenQr}
                onValueChange={setLockScreenQr}
                accessibilityLabel="Emergency QR on lock screen"
              />
            }
          />
        </ListCard>
      </Section>

      <Section index={2}>
        <EmergencyProfileCard
          profile={profile}
          error={toggleError ?? profileError}
          onToggle={toggleField}
          onEdit={() => router.push('/emergency-profile')}
          onRetry={() => void refreshProfile()}
        />
      </Section>

      <Section index={3}>
        <ListCard>
          <ListRow
            leading={<IconTile icon={Eye} tone="neutral" />}
            title="Preview what a responder sees"
            subtitle="The page that opens when someone scans your QR"
            trailing={<Chevron />}
            onPress={() => router.push('/responder-preview')}
            accessibilityLabel="Preview what a responder sees: the page that opens when someone scans your QR"
          />
        </ListCard>
      </Section>

      <FamilySection index={4} />
    </Screen>
  );
}
