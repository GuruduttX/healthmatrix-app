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
import { EmergencyProfileCard } from '@/features/card/emergency-profile-card';
import { MemberCard } from '@/features/card/member-card';
import { sampleCard, type EmergencyFieldId } from '@/features/card/sample-data';

export default function CardScreen() {
  const { signOut } = useAuth();
  const [lockScreenQr, setLockScreenQr] = useState(sampleCard.lockScreenQr);
  const [hidden, setHidden] = useState<EmergencyFieldId[]>(sampleCard.hiddenFields);

  const toggleField = (id: EmergencyFieldId) =>
    setHidden((current) =>
      current.includes(id) ? current.filter((field) => field !== id) : [...current, id],
    );

  return (
    <Screen
      title="My card"
      headerRight={
        <Pressable accessibilityRole="button" style={styles.share}>
          <Share2 size={15} color={Colors.text} strokeWidth={2.2} />
          <ThemedText type="smallBold">Share</ThemedText>
        </Pressable>
      }>
      <View style={styles.sections}>
        <MemberCard member={sampleCard.member} emergencyUrl={sampleCard.emergencyUrl} />

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

        <EmergencyProfileCard hidden={hidden} onToggle={toggleField} />

        <Button
          label="Preview what a responder sees"
          variant="secondary"
          icon={Eye}
          onPress={() =>
            router.push({ pathname: '/responder-preview', params: { hidden: hidden.join(',') } })
          }
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
