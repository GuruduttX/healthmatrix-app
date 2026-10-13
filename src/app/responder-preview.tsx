import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  Activity,
  Ambulance,
  Droplet,
  Eye,
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
import { LIST_LEAD, ListCard, ListRow } from '@/components/ui/list';
import { PageBackground } from '@/components/ui/morning-light';
import { Section } from '@/components/ui/section';
import { Skeleton, SkeletonCircle, SkeletonGroup, SkeletonList } from '@/components/ui/skeleton';
import { StackHeader } from '@/components/ui/stack-header';
import {
  Colors,
  Fonts,
  Gradients,
  Gutter,
  MaxContentWidth,
  Radius,
  Shadows,
  Spacing,
} from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-context';
import { useEmergencyProfile, type EmergencyFieldId } from '@/features/card/emergency-profile';
import { initialsOf, MemberAvatar } from '@/features/profile/member-avatar';
import { useRefreshControl } from '@/hooks/use-refresh-control';

const GENDER_LABELS = { male: 'Male', female: 'Female', other: 'Other' } as const;

const PHOTO = 88;
/** The identity card's side padding; its rule runs through it to the edges. */
const PAD = Spacing.three;

/** "Preview" in the bar, so nobody mistakes it for a real scan. */
function PreviewPill() {
  return (
    <View style={styles.previewPill}>
      <Eye size={14} color={Colors.textSoft} strokeWidth={2.4} />
      <ThemedText style={styles.previewText}>Preview</ThemedText>
    </View>
  );
}

/** A helpline to call, half of one card. Calls are off in the preview, so it only shows. */
function Helpline({ icon: Icon, number, label }: { icon: LucideIcon; number: string; label: string }) {
  return (
    <View style={styles.helpline} accessible accessibilityLabel={`${label} ${number}`}>
      <View style={styles.helplineDish}>
        <Icon size={19} color={Colors.high} strokeWidth={2.3} />
      </View>
      <View style={styles.flex}>
        <ThemedText style={styles.helplineNumber}>{number}</ThemedText>
        <ThemedText style={styles.helplineLabel} numberOfLines={1}>
          {label}
        </ThemedText>
      </View>
    </View>
  );
}

/** One medical detail's items as small pills. Allergies are flagged: crimson, with a warning sign. */
function Items({ items, flagged }: { items: string[]; flagged?: boolean }) {
  return (
    <>
      {items.map((item) => (
        <View key={item} style={[styles.item, flagged && styles.itemFlagged]}>
          {flagged ? <TriangleAlert size={12} color={Colors.high} strokeWidth={2.6} /> : null}
          <ThemedText style={[styles.itemText, flagged && styles.itemTextFlagged]}>{item}</ThemedText>
        </View>
      ))}
    </>
  );
}

/** A line on a card: a round dish, a quiet label, and what it says under it. */
function DetailRow({
  icon,
  tone = 'primary',
  label,
  children,
  meta,
}: {
  icon: LucideIcon;
  tone?: Tone;
  label: string;
  children?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <ListRow
      leading={<IconTile icon={icon} tone={tone} size={LIST_LEAD} />}
      title={<ThemedText style={styles.detailLabel}>{label}</ThemedText>}
      subtitle={children}
      meta={meta}
    />
  );
}

/** The bar at the top: a close button, the page's name, and "Preview". */
function Shell({ title, children }: { title: string; children: ReactNode }) {
  const close = () => (router.canGoBack() ? router.back() : router.replace('/card'));
  return (
    <View style={styles.screen}>
      <PageBackground />
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StackHeader onBack={close} close title={title} right={<PreviewPill />} />
        {children}
      </SafeAreaView>
    </View>
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
  const refreshControl = useRefreshControl(() => Promise.allSettled([refreshMember(), refresh()]));
  const insets = useSafeAreaInsets();

  if (!member || !profile) {
    return (
      <Shell title="Responder view">
        <View style={styles.content}>
          {error ? (
            <ErrorState
              title="Couldn’t load the preview"
              message={error}
              onRetry={() => void refresh()}
            />
          ) : (
            <SkeletonGroup label="Loading the preview" style={styles.skeleton}>
              <View style={[styles.identity, styles.skeletonIdentity]}>
                <SkeletonCircle size={PHOTO} />
                <Skeleton width="50%" height={22} />
                <Skeleton width="25%" height={12} />
              </View>
              <Skeleton height={72} radius={Radius.xl} />
              <SkeletonList rows={3} trailing={false} />
            </SkeletonGroup>
          )}
        </View>
      </Shell>
    );
  }

  const shows = (id: EmergencyFieldId) => profile.visibleFields.includes(id);
  const firstName = member.name.split(/\s+/)[0] ?? member.name;
  const about = member.gender ? GENDER_LABELS[member.gender] : null;
  const { allergies, conditions, medicines, emergencyContacts: contacts, insurance } = profile;

  const medical: {
    icon: LucideIcon;
    tone: Tone;
    label: string;
    items: string[];
    flagged?: boolean;
  }[] = [];
  if (shows('allergies') && allergies.length) {
    medical.push({
      icon: TriangleAlert,
      tone: 'danger',
      label: 'Allergies',
      items: allergies,
      flagged: true,
    });
  }
  if (shows('conditions') && conditions.length) {
    medical.push({ icon: Activity, tone: 'primary', label: 'Conditions', items: conditions });
  }
  if (shows('medicines') && medicines.length) {
    medical.push({ icon: Pill, tone: 'primary', label: 'Current medicines', items: medicines });
  }
  const showBlood = shows('bloodGroup') && !!profile.bloodGroup;
  const showContacts = shows('emergencyContacts') && contacts.length > 0;
  const showDonor = shows('organDonor') && profile.organDonor !== undefined;
  const showInsurance = shows('insurance') && !!insurance;
  const showsAnything = showBlood || medical.length > 0 || showContacts || showDonor || showInsurance;

  return (
    <Shell title="Emergency profile">
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.five }]}>
        {/* Who this is, and their blood group: the page's one raised card. */}
        <Section index={0}>
          <View style={styles.identityShadow}>
            <View style={styles.identity}>
              {/* A faint crimson light at the top: an emergency page, without a red header. */}
              <LinearGradient
                colors={['rgba(251, 234, 238, 0.9)', 'rgba(251, 234, 238, 0)']}
                locations={[0, 0.6]}
                style={[StyleSheet.absoluteFill, styles.noTouch]}
              />
              <View style={styles.medicalId}>
                <Siren size={12} color={Colors.high} strokeWidth={2.6} />
                <ThemedText style={styles.medicalIdText}>Medical ID</ThemedText>
              </View>
              <View style={styles.photoRing}>
                <MemberAvatar
                  name={member.name}
                  photoUrl={shows('photo') ? member.photoUrl : undefined}
                  size={PHOTO}
                />
              </View>
              <View style={styles.names}>
                <ThemedText style={styles.name} numberOfLines={2}>
                  {member.name}
                </ThemedText>
                {about ? <ThemedText style={styles.about}>{about}</ThemedText> : null}
              </View>
              {showBlood ? (
                <>
                  <View style={styles.rule} />
                  <View
                    style={styles.blood}
                    accessible
                    accessibilityLabel={`Blood group ${profile.bloodGroup}`}>
                    <View style={styles.bloodLabelRow}>
                      <Droplet size={13} color={Colors.high} strokeWidth={2.6} />
                      <ThemedText style={styles.bloodLabel}>Blood group</ThemedText>
                    </View>
                    <ThemedText style={styles.bloodValue}>{profile.bloodGroup}</ThemedText>
                  </View>
                </>
              ) : null}
            </View>
          </View>
        </Section>

        <Section index={1}>
          <View style={styles.helplines}>
            <Helpline icon={Ambulance} number="108" label="Ambulance" />
            <View style={styles.helplineDivider} />
            <Helpline icon={Siren} number="112" label="Emergency" />
          </View>
        </Section>

        {medical.length ? (
          <Section title="Medical" index={2}>
            <ListCard>
              {medical.map((row) => (
                <DetailRow
                  key={row.label}
                  icon={row.icon}
                  tone={row.tone}
                  label={row.label}
                  meta={<Items items={row.items} flagged={row.flagged} />}
                />
              ))}
            </ListCard>
          </Section>
        ) : null}

        {showContacts ? (
          <Section title="Emergency contacts" index={3}>
            <ListCard>
              {contacts.map((contact, index) => (
                <ListRow
                  key={index}
                  leading={
                    <View style={styles.contactDish}>
                      <LinearGradient
                        colors={Gradients.dishQuiet}
                        start={{ x: 0.2, y: 0 }}
                        end={{ x: 0.8, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                      <View style={[StyleSheet.absoluteFill, styles.center]}>
                        <ThemedText style={styles.contactInitials}>
                          {initialsOf(contact.name)}
                        </ThemedText>
                      </View>
                    </View>
                  }
                  title={contact.name}
                  subtitle={
                    <ThemedText style={styles.subtitle} numberOfLines={1}>
                      {[contact.relation, contact.phone].filter(Boolean).join(' · ')}
                    </ThemedText>
                  }
                  trailing={
                    <View style={styles.call}>
                      <Phone size={13} color={Colors.onInk} strokeWidth={2.6} />
                      <ThemedText style={styles.callText}>Call</ThemedText>
                    </View>
                  }
                />
              ))}
            </ListCard>
          </Section>
        ) : null}

        {showDonor || showInsurance ? (
          <Section title="Other details" index={4}>
            <ListCard>
              {showDonor ? (
                <DetailRow icon={HeartHandshake} label="Organ donor">
                  <ThemedText style={styles.value}>
                    {profile.organDonor ? 'Yes, registered donor' : 'No'}
                  </ThemedText>
                </DetailRow>
              ) : null}
              {showInsurance && insurance ? (
                <DetailRow icon={ShieldCheck} label="Health insurance">
                  <ThemedText style={styles.value}>{insurance.provider}</ThemedText>
                  {insurance.policyNumber ? (
                    <ThemedText style={styles.subtitle}>Policy {insurance.policyNumber}</ThemedText>
                  ) : null}
                </DetailRow>
              ) : null}
            </ListCard>
          </Section>
        ) : null}

        {showsAnything ? null : (
          <Section index={2}>
            <ListCard>
              <ListRow
                leading={<IconTile icon={PhoneCall} size={LIST_LEAD} />}
                title={
                  <ThemedText style={styles.nothingText}>
                    {firstName} has not added medical details yet. Call the helplines above.
                  </ThemedText>
                }
              />
            </ListCard>
          </Section>
        )}

        <View style={styles.notes}>
          <View style={styles.note}>
            <Lock size={13} color={Colors.textFaint} strokeWidth={2.2} />
            <ThemedText style={styles.noteText}>
              Doctors can request full records with an OTP.
            </ThemedText>
          </View>
          <View style={styles.note}>
            <Eye size={13} color={Colors.textFaint} strokeWidth={2.2} />
            <ThemedText style={styles.noteText}>
              This is a preview. A real scan is logged with the time, and your family is alerted.
            </ThemedText>
          </View>
        </View>
      </ScrollView>
    </Shell>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.canvas,
  },
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  noTouch: {
    pointerEvents: 'none',
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth / 1.5,
    alignSelf: 'center',
    gap: Spacing.four - 4,
    paddingHorizontal: Gutter,
    paddingTop: Spacing.one,
  },
  skeleton: {
    gap: Spacing.four - 4,
  },
  skeletonIdentity: {
    gap: Spacing.three - 4,
    paddingVertical: Spacing.four,
  },
  previewPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 32,
    paddingLeft: 10,
    paddingRight: 12,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.hairline,
    backgroundColor: Colors.backgroundElement,
  },
  previewText: {
    fontFamily: Fonts.bold,
    fontSize: 12.5,
    lineHeight: 16,
    color: Colors.textSoft,
  },

  // The shadow sits outside the card, which clips its corners and wash.
  identityShadow: {
    borderRadius: Radius.xl,
    boxShadow: Shadows.raised,
  },
  identity: {
    alignItems: 'center',
    gap: Spacing.three - 4,
    paddingTop: Spacing.three,
    paddingHorizontal: PAD,
    paddingBottom: Spacing.three + 2,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.hairline,
    overflow: 'hidden',
    backgroundColor: Colors.backgroundElement,
  },
  medicalId: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 3,
    paddingLeft: 8,
    paddingRight: 10,
    borderRadius: Radius.pill,
    backgroundColor: Colors.highSoft,
  },
  medicalIdText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: Colors.high,
  },
  photoRing: {
    padding: 4,
    borderRadius: PHOTO / 2 + 4,
    backgroundColor: Colors.backgroundElement,
    boxShadow: Shadows.dish,
  },
  names: {
    alignItems: 'center',
    gap: 1,
  },
  name: {
    fontFamily: Fonts.displaySemibold,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.5,
    textAlign: 'center',
    color: Colors.text,
  },
  about: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    lineHeight: 19,
    color: Colors.textSoft,
  },
  rule: {
    alignSelf: 'stretch',
    height: StyleSheet.hairlineWidth,
    marginHorizontal: -PAD,
    marginTop: Spacing.one,
    backgroundColor: Colors.hairline,
  },
  blood: {
    alignItems: 'center',
  },
  bloodLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bloodLabel: {
    fontFamily: Fonts.semibold,
    fontSize: 12.5,
    lineHeight: 16,
    color: Colors.textSoft,
  },
  bloodValue: {
    fontFamily: Fonts.displaySemibold,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.5,
    color: Colors.high,
  },

  // Two helplines on one card, a hairline between them.
  helplines: {
    flexDirection: 'row',
    paddingVertical: Spacing.three - 2,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.hairline,
    backgroundColor: Colors.backgroundElement,
    boxShadow: Shadows.soft,
  },
  helplineDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: Colors.hairline,
  },
  helpline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
    paddingHorizontal: Spacing.three - 2,
  },
  helplineDish: {
    width: LIST_LEAD,
    height: LIST_LEAD,
    borderRadius: LIST_LEAD / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.highSoft,
  },
  helplineNumber: {
    fontFamily: Fonts.displaySemibold,
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.3,
    color: Colors.text,
    fontVariant: ['tabular-nums'],
  },
  helplineLabel: {
    fontFamily: Fonts.medium,
    fontSize: 12.5,
    lineHeight: 16,
    color: Colors.textSoft,
  },

  detailLabel: {
    fontFamily: Fonts.semibold,
    fontSize: 12.5,
    lineHeight: 16,
    color: Colors.textFaint,
  },
  value: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    lineHeight: 20,
    color: Colors.text,
  },
  subtitle: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSoft,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
  },
  itemFlagged: {
    paddingLeft: 8,
    borderColor: Colors.highSoft,
    backgroundColor: Colors.highSoft,
  },
  itemText: {
    fontFamily: Fonts.bold,
    fontSize: 13.5,
    lineHeight: 18,
    color: Colors.text,
  },
  itemTextFlagged: {
    color: Colors.high,
  },
  contactDish: {
    width: LIST_LEAD,
    height: LIST_LEAD,
    borderRadius: LIST_LEAD / 2,
    overflow: 'hidden',
  },
  contactInitials: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    lineHeight: 18,
    color: Colors.textSoft,
  },
  // Looks like the page's call button; in the preview it doesn't dial.
  call: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 34,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primaryDeep,
  },
  callText: {
    fontFamily: Fonts.bold,
    fontSize: 13.5,
    lineHeight: 18,
    color: Colors.onInk,
  },
  nothingText: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSoft,
  },
  notes: {
    gap: Spacing.two,
    paddingHorizontal: 2,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  noteText: {
    flex: 1,
    marginTop: -2,
    fontFamily: Fonts.medium,
    fontSize: 12.5,
    lineHeight: 17,
    color: Colors.textFaint,
  },
});
