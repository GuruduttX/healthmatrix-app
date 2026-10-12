import { router } from 'expo-router';
import { ChevronRight, Eye, Share2, Smartphone } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { GlassButton } from '@/components/ui/glass-button';
import { IconTile } from '@/components/ui/icon-tile';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { Surface } from '@/components/ui/surface';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-context';
import { useEmergencyProfile, type EmergencyFieldId } from '@/features/card/emergency-profile';
import { EmergencyProfileCard } from '@/features/card/emergency-profile-card';
import { MemberCard, type CardMember } from '@/features/card/member-card';
import { sampleCard } from '@/features/card/sample-data';
import { useEmergencyQr } from '@/features/card/use-emergency-qr';
import { FamilySection } from '@/features/family/family-section';
import { useFamily } from '@/features/family/use-family';
import { HomeSection } from '@/features/home/home-section';
import { type Member } from '@/types';

/** How far the member card rides up over the header. */
const OVERLAP = 96;

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

/** A setting or link on a white card: icon, title, one line, and a control at the right. */
function SettingRow({
  icon,
  title,
  caption,
  right,
  onPress,
}: {
  icon: typeof Eye;
  title: string;
  caption: string;
  right: ReactNode;
  onPress?: () => void;
}) {
  const content = (
    <>
      <IconTile icon={icon} tone="neutral" size={40} />
      <View style={styles.flex}>
        <ThemedText type="bodyBold">{title}</ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          {caption}
        </ThemedText>
      </View>
      {right}
    </>
  );
  return onPress ? (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, styles.rowCard, pressed && styles.pressed]}>
      {content}
    </Pressable>
  ) : (
    <Surface style={styles.row}>{content}</Surface>
  );
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
      subtitle="Your health ID, emergency QR and family."
      heroOverlap={OVERLAP}
      onRefresh={() =>
        Promise.allSettled([refreshMember(), refreshQr(), refreshProfile(), refreshFamily()])
      }
      headerRight={<GlassButton icon={Share2} label="Share" accessibilityLabel="Share your card" />}>
      <View style={styles.sections}>
        <HomeSection index={0}>
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
        </HomeSection>

        <HomeSection index={1}>
          <SettingRow
            icon={Smartphone}
            title="QR on lock screen"
            caption="Visible without unlocking your phone"
            right={
              <Switch
                value={lockScreenQr}
                onValueChange={setLockScreenQr}
                trackColor={{ false: Colors.border, true: Colors.success }}
                thumbColor={Colors.backgroundElement}
                accessibilityLabel="Emergency QR on lock screen"
              />
            }
          />
        </HomeSection>

        <HomeSection index={2}>
          <EmergencyProfileCard
            profile={profile}
            error={toggleError ?? profileError}
            onToggle={toggleField}
            onEdit={() => router.push('/emergency-profile')}
            onRetry={() => void refreshProfile()}
          />
        </HomeSection>

        <HomeSection index={3}>
          <SettingRow
            icon={Eye}
            title="Preview what a responder sees"
            caption="The page that opens when someone scans your QR"
            onPress={() => router.push('/responder-preview')}
            right={<ChevronRight size={20} color={Colors.textMuted} strokeWidth={2.2} />}
          />
        </HomeSection>

        <HomeSection index={4}>
          <FamilySection />
        </HomeSection>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sections: {
    gap: Spacing.three + 4,
  },
  flex: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
  },
  rowCard: {
    padding: Spacing.three,
    borderRadius: Radius.lg + 4,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
    boxShadow: Shadows.card,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
});
