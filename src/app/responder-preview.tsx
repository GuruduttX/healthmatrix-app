import { LinearGradient } from 'expo-linear-gradient';
import { router, useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  Activity,
  Ambulance,
  HeartHandshake,
  Lock,
  Phone,
  PhoneCall,
  Pill,
  ShieldCheck,
  Siren,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react-native';
import { type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ErrorState } from '@/components/ui/empty-state';
import { IconTile, type Tone } from '@/components/ui/icon-tile';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { StackHeader } from '@/components/ui/stack-header';
import { Surface } from '@/components/ui/surface';
import { Colors, Fonts, MaxContentWidth, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-context';
import { useEmergencyProfile, type EmergencyFieldId } from '@/features/card/emergency-profile';
import { initialsOf, MemberAvatar } from '@/features/profile/member-avatar';
import { useRefreshControl } from '@/hooks/use-refresh-control';

const GENDER_LABELS = { male: 'Male', female: 'Female', other: 'Other' } as const;

/** Deep red to orange: the header of an emergency page. */
const EMERGENCY = ['#6E1A00', Colors.danger, Colors.primaryMid] as const;

/** "Preview" on the red header, so nobody mistakes it for a real scan. */
function PreviewPill() {
  return (
    <View style={styles.previewPill}>
      <ThemedText style={styles.previewText}>Preview</ThemedText>
    </View>
  );
}

/** A big helpline to call. Calls are off in the preview, so it only shows. */
function Helpline({ icon: Icon, number, label }: { icon: LucideIcon; number: string; label: string }) {
  return (
    <View style={styles.helpline} accessible accessibilityLabel={`${label} ${number}`}>
      <View style={styles.helplineIcon}>
        <Icon size={20} color={Colors.onInk} strokeWidth={2.3} />
      </View>
      <View>
        <ThemedText style={styles.helplineNumber}>{number}</ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          {label}
        </ThemedText>
      </View>
    </View>
  );
}

/** One kind of medical detail: an icon, its name, then each item as a chip. */
function DetailRow({
  icon,
  tone,
  label,
  items,
  first,
}: {
  icon: LucideIcon;
  tone: Tone;
  label: string;
  items: string[];
  first?: boolean;
}) {
  return (
    <View style={[styles.detail, !first && styles.divider]}>
      <IconTile icon={icon} tone={tone} size={36} />
      <View style={styles.flex}>
        <ThemedText type="caption" themeColor="textMuted" style={styles.detailLabel}>
          {label}
        </ThemedText>
        <View style={styles.chips}>
          {items.map((item) => (
            <View key={item} style={styles.chip}>
              <ThemedText type="smallBold">{item}</ThemedText>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

/** A section title inside the page. */
function Heading({ children }: { children: ReactNode }) {
  return (
    <ThemedText style={styles.heading} accessibilityRole="header">
      {children}
    </ThemedText>
  );
}

/**
 * What a stranger sees after scanning the emergency QR, limited to the fields the member chose
 * to show. It mirrors the public page (`src/server/emergency-page.ts`) as an app screen. Preview
 * only: nobody is alerted, the scan is not logged and the call buttons don't dial.
 */
export default function ResponderPreviewScreen() {
  const { member, refreshMember } = useAuth();
  const { profile, error, refresh } = useEmergencyProfile();
  const refreshControl = useRefreshControl(() => Promise.allSettled([refreshMember(), refresh()]), {
    tintColor: Colors.onInk,
  });
  const insets = useSafeAreaInsets();
  // Light status bar text over the red header, only while this screen is showing.
  const focused = useIsFocused();
  const close = () => (router.canGoBack() ? router.back() : router.replace('/card'));

  if (!member || !profile) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StackHeader onBack={close} close title="Responder view" />
        <View style={styles.loadingBody}>
          {error ? (
            <ErrorState
              title="Couldn’t load the preview"
              message={error}
              onRetry={() => void refresh()}
            />
          ) : (
            <SkeletonGroup label="Loading the preview" style={styles.skeleton}>
              <Skeleton height={230} radius={Radius.xl} />
              <View style={styles.helplines}>
                <Skeleton height={68} radius={Radius.lg} style={styles.flex} />
                <Skeleton height={68} radius={Radius.lg} style={styles.flex} />
              </View>
              <Skeleton height={150} radius={Radius.xl} />
              <Skeleton height={120} radius={Radius.xl} />
            </SkeletonGroup>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const shows = (id: EmergencyFieldId) => profile.visibleFields.includes(id);
  const firstName = member.name.split(/\s+/)[0] ?? member.name;
  const about = member.gender ? GENDER_LABELS[member.gender] : null;
  const { allergies, conditions, medicines, emergencyContacts: contacts, insurance } = profile;

  const medical: { icon: LucideIcon; tone: Tone; label: string; items: string[] }[] = [];
  if (shows('allergies') && allergies.length) {
    medical.push({ icon: TriangleAlert, tone: 'danger', label: 'Allergies', items: allergies });
  }
  if (shows('conditions') && conditions.length) {
    medical.push({ icon: Activity, tone: 'warning', label: 'Conditions', items: conditions });
  }
  if (shows('medicines') && medicines.length) {
    medical.push({ icon: Pill, tone: 'success', label: 'Current medicines', items: medicines });
  }
  const showContacts = shows('emergencyContacts') && contacts.length > 0;
  const showDonor = shows('organDonor') && profile.organDonor !== undefined;
  const showInsurance = shows('insurance') && !!insurance;
  const showsAnything =
    (shows('bloodGroup') && !!profile.bloodGroup) ||
    medical.length > 0 ||
    showContacts ||
    showDonor ||
    showInsurance;

  return (
    <View style={styles.screen}>
      {focused ? <StatusBar style="light" /> : null}
      <ScrollView
        style={styles.redScroll}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
        contentContainerStyle={styles.grow}>
        {/* The red header: who this is, and their blood group. */}
        <View style={styles.hero}>
          <View style={styles.heroClip} pointerEvents="none">
            <LinearGradient
              colors={EMERGENCY}
              locations={[0, 0.55, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </View>
          <View style={[styles.heroInner, { paddingTop: insets.top }]}>
            <StackHeader
              onBack={close}
              close
              tone="dark"
              title="Emergency profile"
              right={<PreviewPill />}
            />
            <View style={styles.identity}>
              <View style={styles.sos}>
                <Siren size={13} color={Colors.onInk} strokeWidth={2.4} />
                <ThemedText style={styles.sosText}>Medical ID</ThemedText>
              </View>
              <View style={styles.avatarRing}>
                {shows('photo') && member.photoUrl ? (
                  <MemberAvatar name={member.name} photoUrl={member.photoUrl} size={84} />
                ) : (
                  <View style={styles.initials}>
                    <ThemedText style={styles.initialsText}>{initialsOf(member.name)}</ThemedText>
                  </View>
                )}
              </View>
              <ThemedText style={styles.name} numberOfLines={2}>
                {member.name}
              </ThemedText>
              {about ? <ThemedText style={styles.about}>{about}</ThemedText> : null}
              {shows('bloodGroup') && profile.bloodGroup ? (
                <View style={styles.blood}>
                  <ThemedText style={styles.bloodLabel}>Blood group</ThemedText>
                  <ThemedText style={styles.bloodValue}>{profile.bloodGroup}</ThemedText>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.bounce} />
          <View style={styles.content}>
            <View style={styles.helplines}>
              <Helpline icon={Ambulance} number="108" label="Ambulance" />
              <Helpline icon={Siren} number="112" label="Emergency" />
            </View>

            {medical.length ? (
              <View style={styles.section}>
                <Heading>Medical</Heading>
                <Surface style={styles.list}>
                  {medical.map((row, index) => (
                    <DetailRow key={row.label} {...row} first={index === 0} />
                  ))}
                </Surface>
              </View>
            ) : null}

            {showContacts ? (
              <View style={styles.section}>
                <Heading>Emergency contacts</Heading>
                <Surface style={styles.list}>
                  {contacts.map((contact, index) => (
                    <View key={index} style={[styles.contact, index > 0 && styles.divider]}>
                      <View style={styles.contactAvatar}>
                        <ThemedText style={styles.contactInitials}>
                          {initialsOf(contact.name)}
                        </ThemedText>
                      </View>
                      <View style={styles.flex}>
                        <ThemedText type="smallBold" numberOfLines={1}>
                          {contact.name}
                        </ThemedText>
                        <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
                          {[contact.relation, contact.phone].filter(Boolean).join(' · ')}
                        </ThemedText>
                      </View>
                      <View style={styles.call}>
                        <Phone size={13} color={Colors.onInk} strokeWidth={2.6} />
                        <ThemedText type="caption" style={styles.callText}>
                          Call
                        </ThemedText>
                      </View>
                    </View>
                  ))}
                </Surface>
              </View>
            ) : null}

            {showDonor || showInsurance ? (
              <View style={styles.section}>
                <Heading>Other details</Heading>
                <Surface style={styles.list}>
                  {showDonor ? (
                    <View style={styles.detail}>
                      <IconTile icon={HeartHandshake} tone="danger" size={36} />
                      <View style={styles.flex}>
                        <ThemedText type="caption" themeColor="textMuted" style={styles.detailLabel}>
                          Organ donor
                        </ThemedText>
                        <ThemedText type="smallBold">
                          {profile.organDonor ? 'Yes, registered donor' : 'No'}
                        </ThemedText>
                      </View>
                    </View>
                  ) : null}
                  {showInsurance && insurance ? (
                    <View style={[styles.detail, showDonor && styles.divider]}>
                      <IconTile icon={ShieldCheck} tone="neutral" size={36} />
                      <View style={styles.flex}>
                        <ThemedText type="caption" themeColor="textMuted" style={styles.detailLabel}>
                          Health insurance
                        </ThemedText>
                        <ThemedText type="smallBold">{insurance.provider}</ThemedText>
                        {insurance.policyNumber ? (
                          <ThemedText type="caption" themeColor="textSecondary">
                            Policy {insurance.policyNumber}
                          </ThemedText>
                        ) : null}
                      </View>
                    </View>
                  ) : null}
                </Surface>
              </View>
            ) : null}

            {showsAnything ? null : (
              <Surface style={styles.nothing}>
                <IconTile icon={PhoneCall} tone="primary" size={40} />
                <ThemedText type="small" themeColor="textSecondary" style={styles.flex}>
                  {firstName} has not added medical details yet. Call the helplines above.
                </ThemedText>
              </Surface>
            )}

            <View style={styles.notes}>
              <View style={styles.note}>
                <Lock size={13} color={Colors.textSecondary} strokeWidth={2.2} />
                <ThemedText type="caption" themeColor="textSecondary" style={styles.flex}>
                  Doctors can request full records with an OTP.
                </ThemedText>
              </View>
              <View style={styles.note}>
                <Siren size={13} color={Colors.textSecondary} strokeWidth={2.2} />
                <ThemedText type="caption" themeColor="textSecondary" style={styles.flex}>
                  This is a preview. A real scan is logged with the time, and your family is
                  alerted.
                </ThemedText>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingBody: {
    width: '100%',
    maxWidth: MaxContentWidth / 1.5,
    alignSelf: 'center',
    padding: Spacing.three,
    paddingTop: Spacing.one,
  },
  skeleton: {
    gap: Spacing.three,
  },
  // Red behind the content, so pulling down shows the header's colour above it.
  redScroll: {
    backgroundColor: EMERGENCY[0],
  },
  grow: {
    flexGrow: 1,
  },
  flex: {
    flex: 1,
  },
  hero: {
    paddingBottom: Spacing.five + Spacing.three,
    // Shows at the rounded bottom corners.
    backgroundColor: Colors.background,
  },
  heroClip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  heroInner: {
    width: '100%',
    maxWidth: MaxContentWidth / 1.5,
    alignSelf: 'center',
  },
  previewPill: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  previewText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    lineHeight: 14,
    color: Colors.onInk,
  },
  identity: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.three,
  },
  sos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: Spacing.two,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
  },
  sosText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: Colors.onInk,
  },
  avatarRing: {
    padding: 4,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  initials: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundElement,
  },
  initialsText: {
    fontFamily: Fonts.display,
    fontSize: 30,
    lineHeight: 36,
    color: Colors.danger,
  },
  name: {
    marginTop: Spacing.two,
    fontFamily: Fonts.display,
    fontSize: 26,
    lineHeight: 32,
    textAlign: 'center',
    color: Colors.onInk,
  },
  about: {
    marginTop: -4,
    fontFamily: Fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  blood: {
    alignItems: 'center',
    marginTop: Spacing.two,
    paddingVertical: 8,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.lg,
    backgroundColor: Colors.backgroundElement,
    boxShadow: '0 10px 24px rgba(80, 20, 0, 0.3)',
  },
  bloodLabel: {
    fontFamily: Fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    color: Colors.textSecondary,
  },
  bloodValue: {
    fontFamily: Fonts.display,
    fontSize: 34,
    lineHeight: 40,
    color: Colors.danger,
  },
  body: {
    flexGrow: 1,
    backgroundColor: Colors.background,
  },
  // Light below the last section too, for the bounce at the bottom on iOS.
  bounce: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    height: 1000,
    backgroundColor: Colors.background,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth / 1.5,
    alignSelf: 'center',
    gap: Spacing.three + 2,
    marginTop: -Spacing.five,
    padding: Spacing.three,
    paddingTop: 0,
    paddingBottom: Spacing.five,
  },
  helplines: {
    flexDirection: 'row',
    gap: Spacing.three - 4,
  },
  helpline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
    padding: 12,
    borderRadius: Radius.lg + 2,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
    boxShadow: Shadows.lifted,
  },
  helplineIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.danger,
  },
  helplineNumber: {
    fontFamily: Fonts.display,
    fontSize: 22,
    lineHeight: 26,
    color: Colors.text,
  },
  section: {
    gap: Spacing.two + 2,
  },
  heading: {
    fontFamily: Fonts.display,
    fontSize: 18,
    lineHeight: 24,
  },
  list: {
    paddingVertical: Spacing.one,
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three - 4,
    paddingVertical: 12,
  },
  detailLabel: {
    fontFamily: Fonts.semibold,
    marginBottom: 4,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  contact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
    paddingVertical: 12,
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.successSoft,
  },
  contactInitials: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    lineHeight: 18,
    color: Colors.success,
  },
  call: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
    backgroundColor: Colors.success,
  },
  callText: {
    fontFamily: Fonts.bold,
    color: Colors.onInk,
  },
  nothing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
  },
  notes: {
    gap: Spacing.two,
    padding: 14,
    borderRadius: Radius.lg,
    backgroundColor: Colors.backgroundSelected,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
