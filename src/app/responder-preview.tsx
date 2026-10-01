import { router, useLocalSearchParams } from 'expo-router';
import { Ambulance, Lock, Phone, Siren, X } from 'lucide-react-native';
import { type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { Surface } from '@/components/ui/surface';
import { Tag } from '@/components/ui/tag';
import { Colors, Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { sampleCard, type EmergencyFieldId } from '@/features/card/sample-data';

/**
 * What a stranger sees after scanning the emergency QR, limited to the fields
 * the member chose to show. Preview only: the call buttons do nothing here.
 */
export default function ResponderPreviewScreen() {
  const params = useLocalSearchParams<{ hidden?: string }>();
  const hidden = (params.hidden ?? '').split(',');
  const shows = (id: EmergencyFieldId) => !hidden.includes(id);

  const { member, profile } = sampleCard;
  const about = shows('organDonor')
    ? `${member.about}. Organ donor: ${profile.organDonor ? 'yes' : 'no'}`
    : member.about;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <Tag label="Preview" tone="neutral" />
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Close preview"
          hitSlop={10}
          style={styles.close}>
          <X size={18} color={Colors.text} strokeWidth={2.2} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.banner}>
          <View style={styles.bannerTitle}>
            <Siren size={18} color={Colors.onInk} strokeWidth={2.2} />
            <ThemedText type="bodyBold" themeColor="onInk">
              Emergency profile
            </ThemedText>
          </View>
          <ThemedText type="caption" style={styles.bannerText}>
            This is a preview, so nobody is alerted. On a real scan your family gets the time and
            location.
          </ThemedText>
        </View>

        <View style={styles.identity}>
          <Avatar initials={member.initials} size={44} />
          <View style={styles.flex}>
            <ThemedText type="bodyBold">{member.name}</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              {about}
            </ThemedText>
          </View>
        </View>

        <View style={styles.tiles}>
          {shows('bloodGroup') ? (
            <View style={styles.bloodGroup}>
              <ThemedText type="caption" themeColor="danger">
                Blood group
              </ThemedText>
              <ThemedText style={styles.bloodGroupValue}>{member.bloodGroup}</ThemedText>
            </View>
          ) : null}
          <View style={styles.tileColumn}>
            {shows('allergies') ? (
              <Field label="Allergy" value={profile.allergies.join(', ') || 'None recorded'} />
            ) : null}
            {shows('conditions') ? (
              <Field label="Condition" value={profile.conditions.join(', ') || 'None recorded'} />
            ) : null}
          </View>
        </View>

        {shows('medicines') ? (
          <Field
            label="Current medicines"
            value={profile.medicines.join('; ') || 'No regular medicines'}
          />
        ) : null}

        {shows('contacts') ? (
          <Surface style={styles.contacts}>
            <ThemedText type="caption" themeColor="textSecondary">
              Emergency contacts
            </ThemedText>
            {profile.contacts.map((contact) => (
              <View key={contact.name} style={styles.contact}>
                <View style={styles.flex}>
                  <ThemedText type="smallBold">{contact.name}</ThemedText>
                  <ThemedText type="caption" themeColor="textSecondary">
                    {contact.relation}
                  </ThemedText>
                </View>
                <View style={styles.call}>
                  <Phone size={13} color={Colors.onInk} strokeWidth={2.4} />
                  <ThemedText type="caption" style={styles.callText}>
                    Call
                  </ThemedText>
                </View>
              </View>
            ))}
          </Surface>
        ) : null}

        {shows('insurance') ? <Field label="Insurance" value={profile.insurance} /> : null}
        {shows('homeAddress') ? <Field label="Home address" value={profile.homeAddress} /> : null}

        <View style={styles.ambulance}>
          <Ambulance size={18} color={Colors.onInk} strokeWidth={2.2} />
          <ThemedText type="bodyBold" themeColor="onInk">
            Call ambulance 108
          </ThemedText>
        </View>

        <View style={styles.footnote}>
          <Lock size={13} color={Colors.textSecondary} strokeWidth={2.2} />
          <ThemedText type="caption" themeColor="textSecondary">
            Doctors: request full records with an OTP
          </ThemedText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Surface style={styles.field}>
      <ThemedText type="caption" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold">{value}</ThemedText>
    </Surface>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: MaxContentWidth / 1.5,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
  },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundSelected,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth / 1.5,
    gap: Spacing.two + 2,
    padding: Spacing.three,
    paddingTop: 0,
    paddingBottom: Spacing.five,
  },
  banner: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primary,
  },
  bannerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  bannerText: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 4,
    paddingVertical: Spacing.one,
  },
  tiles: {
    flexDirection: 'row',
    gap: Spacing.two + 2,
  },
  bloodGroup: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.one,
    padding: 14,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.dangerSoft,
  },
  bloodGroupValue: {
    fontFamily: Fonts.display,
    fontSize: 34,
    lineHeight: 38,
    color: Colors.primary,
  },
  tileColumn: {
    flex: 1.6,
    gap: Spacing.two + 2,
  },
  field: {
    gap: 2,
    paddingVertical: 10,
  },
  contacts: {
    gap: Spacing.two + 2,
  },
  contact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  call: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primary,
  },
  callText: {
    fontFamily: Fonts.bold,
    color: Colors.onInk,
  },
  ambulance: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: 14,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primary,
  },
  footnote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
});
