import { router } from 'expo-router';
import { Ambulance, Lock, Phone, Siren, X } from 'lucide-react-native';
import { type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Surface } from '@/components/ui/surface';
import { Tag } from '@/components/ui/tag';
import { Colors, Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-context';
import { useEmergencyProfile, type EmergencyFieldId } from '@/features/card/emergency-profile';
import { MemberAvatar } from '@/features/profile/member-avatar';
import { useRefreshControl } from '@/hooks/use-refresh-control';

const GENDER_LABELS = { male: 'Male', female: 'Female', other: 'Other' } as const;

/**
 * What a stranger sees after scanning the emergency QR, limited to the fields the member chose
 * to show. It mirrors the public page (`src/server/emergency-page.ts`). Preview only: nobody is
 * alerted and the scan is not logged.
 */
export default function ResponderPreviewScreen() {
  const { member, refreshMember } = useAuth();
  const { profile, error, refresh } = useEmergencyProfile();
  const refreshControl = useRefreshControl(() => Promise.allSettled([refreshMember(), refresh()]));

  if (!member || !profile) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.loading]}>
        {error ? (
          <ThemedText type="small" themeColor="danger">
            {error}
          </ThemedText>
        ) : (
          <ActivityIndicator color={Colors.textSecondary} />
        )}
      </SafeAreaView>
    );
  }

  const shows = (id: EmergencyFieldId) => profile.visibleFields.includes(id);
  const firstName = member.name.split(/\s+/)[0] ?? member.name;
  const about = member.gender ? GENDER_LABELS[member.gender] : null;
  const { allergies, conditions, medicines, emergencyContacts: contacts, insurance } = profile;
  const showsAnything =
    (shows('bloodGroup') && !!profile.bloodGroup) ||
    (shows('allergies') && allergies.length > 0) ||
    (shows('conditions') && conditions.length > 0) ||
    (shows('medicines') && medicines.length > 0) ||
    (shows('emergencyContacts') && contacts.length > 0) ||
    (shows('organDonor') && profile.organDonor !== undefined) ||
    (shows('insurance') && !!insurance);

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

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
        contentContainerStyle={styles.content}>
        <View style={styles.banner}>
          <View style={styles.bannerTitle}>
            <Siren size={18} color={Colors.onInk} strokeWidth={2.2} />
            <ThemedText type="bodyBold" themeColor="onInk">
              Emergency profile
            </ThemedText>
          </View>
          <ThemedText type="caption" style={styles.bannerText}>
            This is a preview of the page your QR opens. Real scans are logged with the time.
          </ThemedText>
        </View>

        <View style={styles.identity}>
          <MemberAvatar
            name={member.name}
            photoUrl={shows('photo') ? member.photoUrl : undefined}
            size={44}
          />
          <View style={styles.flex}>
            <ThemedText type="bodyBold">{member.name}</ThemedText>
            {about ? (
              <ThemedText type="caption" themeColor="textSecondary">
                {about}
              </ThemedText>
            ) : null}
          </View>
        </View>

        {shows('bloodGroup') && profile.bloodGroup ? (
          <View style={styles.bloodGroup}>
            <ThemedText type="caption" themeColor="danger">
              Blood group
            </ThemedText>
            <ThemedText style={styles.bloodGroupValue}>{profile.bloodGroup}</ThemedText>
          </View>
        ) : null}

        {shows('allergies') && allergies.length ? (
          <Field label="Allergies" value={allergies.join(', ')} />
        ) : null}
        {shows('conditions') && conditions.length ? (
          <Field label="Conditions" value={conditions.join(', ')} />
        ) : null}
        {shows('medicines') && medicines.length ? (
          <Field label="Current medicines" value={medicines.join('; ')} />
        ) : null}

        {shows('emergencyContacts') && contacts.length ? (
          <Surface style={styles.contacts}>
            <ThemedText type="caption" themeColor="textSecondary">
              Emergency contacts
            </ThemedText>
            {contacts.map((contact, index) => (
              <View key={index} style={styles.contact}>
                <View style={styles.flex}>
                  <ThemedText type="smallBold">{contact.name}</ThemedText>
                  {contact.relation ? (
                    <ThemedText type="caption" themeColor="textSecondary">
                      {contact.relation}
                    </ThemedText>
                  ) : null}
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

        {shows('organDonor') && profile.organDonor !== undefined ? (
          <Field label="Organ donor" value={profile.organDonor ? 'Yes' : 'No'} />
        ) : null}
        {shows('insurance') && insurance ? (
          <Field
            label="Insurance"
            value={
              insurance.policyNumber
                ? `${insurance.provider} · Policy ${insurance.policyNumber}`
                : insurance.provider
            }
          />
        ) : null}

        {showsAnything ? null : (
          <Surface style={styles.field}>
            <ThemedText type="small" themeColor="textSecondary">
              {firstName} has not added medical details yet. Call the helplines below.
            </ThemedText>
          </Surface>
        )}

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
  loading: {
    justifyContent: 'center',
  },
  bloodGroup: {
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
