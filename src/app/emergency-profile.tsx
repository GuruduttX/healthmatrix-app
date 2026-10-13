import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  Activity,
  AlertCircle,
  Droplet,
  HeartHandshake,
  Phone,
  Pill,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { ErrorState } from '@/components/ui/empty-state';
import { IconTile } from '@/components/ui/icon-tile';
import { Divided } from '@/components/ui/list';
import { PageBackground } from '@/components/ui/morning-light';
import { Skeleton, SkeletonCircle, SkeletonGroup } from '@/components/ui/skeleton';
import { StackHeader } from '@/components/ui/stack-header';
import { Surface } from '@/components/ui/surface';
import { TextField } from '@/components/ui/text-field';
import { Colors, Fonts, Gutter, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { ContactsEditor, type ContactDraft } from '@/features/card/contacts-editor';
import {
  useEmergencyProfile,
  type EmergencyProfile,
  type EmergencyProfileUpdate,
} from '@/features/card/emergency-profile';
import { addItem, ListEditor } from '@/features/card/list-editor';
import { type BloodGroup } from '@/types';

const BLOOD_GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const LISTS = {
  allergies: {
    label: 'Allergies',
    hint: 'Medicines, foods or anything else that causes a reaction.',
    placeholder: 'e.g. Penicillin',
    suggestions: ['Penicillin', 'Sulfa drugs', 'Aspirin', 'Peanuts', 'Latex'],
  },
  conditions: {
    label: 'Conditions',
    hint: 'Ongoing conditions a doctor should know about first.',
    placeholder: 'e.g. Type 2 diabetes',
    suggestions: ['Diabetes', 'Hypertension', 'Asthma', 'Epilepsy', 'Heart disease'],
  },
  medicines: {
    label: 'Current medicines',
    hint: 'Name, strength and how often, if you know them.',
    placeholder: 'e.g. Metformin 500 mg, twice a day',
    suggestions: [],
  },
} as const;

type ListKey = keyof typeof LISTS;

/** The icon beside each list's title, in the same quiet dish as every other part. */
const LIST_ICONS: Record<ListKey, LucideIcon> = {
  allergies: TriangleAlert,
  conditions: Activity,
  medicines: Pill,
};

/** Every part's round lead. */
const LEAD = 36;

/** The page colour, from clear to solid, above the Save button. */
const FADE = ['rgba(248, 245, 240, 0)', Colors.canvas] as const;

type Form = {
  bloodGroup?: BloodGroup;
  allergies: string[];
  conditions: string[];
  medicines: string[];
  contacts: ContactDraft[];
  organDonor?: boolean;
  insuranceProvider: string;
  policyNumber: string;
};

function toForm(profile: EmergencyProfile): Form {
  return {
    bloodGroup: profile.bloodGroup,
    allergies: profile.allergies,
    conditions: profile.conditions,
    medicines: profile.medicines,
    contacts: profile.emergencyContacts.map((contact) => ({
      name: contact.name,
      relation: contact.relation ?? '',
      phone: contact.phone,
    })),
    organDonor: profile.organDonor,
    insuranceProvider: profile.insurance?.provider ?? '',
    policyNumber: profile.insurance?.policyNumber ?? '',
  };
}

const NO_DRAFTS: Record<ListKey, string> = { allergies: '', conditions: '', medicines: '' };

/** The update to send, or the first thing the member still has to fix. */
function toUpdate(form: Form, drafts: Record<ListKey, string>): EmergencyProfileUpdate | string {
  // Rows left completely blank are dropped; half-filled ones need finishing.
  const contacts = form.contacts
    .map((contact) => ({
      name: contact.name.trim(),
      relation: contact.relation.trim(),
      phone: contact.phone.trim(),
    }))
    .filter((contact) => contact.name || contact.relation || contact.phone);
  if (contacts.some((contact) => !contact.name || !contact.phone)) {
    return 'Each emergency contact needs a name and a mobile number.';
  }

  const provider = form.insuranceProvider.trim();
  const policyNumber = form.policyNumber.trim();
  if (policyNumber && !provider) return 'Enter the insurer’s name for your policy.';

  return {
    bloodGroup: form.bloodGroup ?? null,
    // Something typed but not yet added with + still counts.
    allergies: addItem(form.allergies, drafts.allergies),
    conditions: addItem(form.conditions, drafts.conditions),
    medicines: addItem(form.medicines, drafts.medicines),
    emergencyContacts: contacts.map((contact) => ({
      name: contact.name,
      relation: contact.relation || undefined,
      phone: contact.phone,
    })),
    organDonor: form.organDonor ?? null,
    insurance: provider ? { provider, policyNumber: policyNumber || undefined } : null,
  };
}

/** Where the member fills in what a responder sees after scanning their QR. */
export default function EmergencyProfileScreen() {
  const { profile, error: loadError, refresh, save } = useEmergencyProfile();
  const [form, setForm] = useState<Form | null>(null);
  const [drafts, setDrafts] = useState(NO_DRAFTS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [changed, setChanged] = useState(false);

  // Fill the form once, when the profile first arrives.
  if (profile && !form) setForm(toForm(profile));

  const close = () => (router.canGoBack() ? router.back() : router.replace('/card'));

  const edit = (patch: Partial<Form>) => {
    setForm((current) => (current ? { ...current, ...patch } : current));
    setChanged(true);
    setError(null);
  };

  const editDraft = (key: ListKey) => (value: string) => {
    setDrafts((current) => ({ ...current, [key]: value }));
    if (value.trim()) setChanged(true);
    setError(null);
  };

  const submit = async () => {
    if (!form) return;
    const update = toUpdate(form, drafts);
    if (typeof update === 'string') {
      setError(update);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await save(update);
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your details. Try again.');
      setBusy(false);
    }
  };


  return (
    <View style={styles.screen}>
      <PageBackground />
      <SafeAreaView style={styles.safeArea}>
        <StackHeader onBack={close} backLabel="My card" title="Emergency details" />

        {!form ? (
          <View style={styles.content}>
            {loadError ? (
              <ErrorState
                title="Couldn’t load your emergency details"
                message={loadError}
                onRetry={() => void refresh()}
              />
            ) : (
              <FormSkeleton />
            )}
          </View>
        ) : (
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.content}>
              <View style={styles.intro}>
                <ShieldAlert size={15} color={Colors.textFaint} strokeWidth={2.2} />
                <ThemedText style={styles.introText}>
                  Anyone who scans your QR sees these details, but only the fields you switch on in
                  My card.
                </ThemedText>
              </View>

              <Surface style={styles.card}>
                <Group title="Blood group" icon={Droplet}>
                  <View style={styles.bloodGroups}>
                    {BLOOD_GROUPS.map((group) => (
                      <View key={group} style={styles.bloodGroup}>
                        <Chip
                          label={group}
                          selected={form.bloodGroup === group}
                          onPress={() =>
                            edit({ bloodGroup: form.bloodGroup === group ? undefined : group })
                          }
                        />
                      </View>
                    ))}
                  </View>
                </Group>
              </Surface>

              {/* What a responder reads first, together as on their page. */}
              <Surface style={styles.card}>
                <Divided inset={0}>
                  {(Object.keys(LISTS) as ListKey[]).map((key) => (
                    <Group
                      key={key}
                      title={LISTS[key].label}
                      hint={LISTS[key].hint}
                      icon={LIST_ICONS[key]}>
                      <ListEditor
                        items={form[key]}
                        onChange={(items) => edit({ [key]: items })}
                        draft={drafts[key]}
                        onDraftChange={editDraft(key)}
                        placeholder={LISTS[key].placeholder}
                        label={LISTS[key].label}
                        suggestions={[...LISTS[key].suggestions]}
                        editable={!busy}
                      />
                    </Group>
                  ))}
                </Divided>
              </Surface>

              <Surface style={styles.card}>
                <Group
                  title="Emergency contacts"
                  hint="Family or friends to call first. A responder can call them from the page."
                  icon={Phone}>
                  <ContactsEditor
                    contacts={form.contacts}
                    onChange={(contacts) => edit({ contacts })}
                    editable={!busy}
                  />
                </Group>
              </Surface>

              <Surface style={styles.card}>
                <Divided inset={0}>
                  <Group title="Organ donor" icon={HeartHandshake}>
                    <View style={styles.choices}>
                      {[
                        { label: 'Yes', value: true },
                        { label: 'No', value: false },
                      ].map((option) => (
                        <View key={option.label} style={styles.choice}>
                          <Chip
                            label={option.label}
                            selected={form.organDonor === option.value}
                            onPress={() =>
                              edit({
                                organDonor:
                                  form.organDonor === option.value ? undefined : option.value,
                              })
                            }
                          />
                        </View>
                      ))}
                    </View>
                  </Group>

                  <Group title="Health insurance" icon={ShieldCheck}>
                    <TextField
                      label="Insurer"
                      value={form.insuranceProvider}
                      onChangeText={(insuranceProvider) => edit({ insuranceProvider })}
                      placeholder="e.g. Star Health"
                      maxLength={60}
                      editable={!busy}
                    />
                    <TextField
                      label="Policy number (optional)"
                      value={form.policyNumber}
                      onChangeText={(policyNumber) => edit({ policyNumber })}
                      placeholder="e.g. SH-2231-889"
                      autoCapitalize="characters"
                      autoCorrect={false}
                      maxLength={40}
                      editable={!busy}
                    />
                  </Group>
                </Divided>
              </Surface>
            </ScrollView>

            {/* Save stays in reach at the bottom; the form fades out under it. */}
            <View style={styles.footer}>
              <LinearGradient
                colors={FADE}
                style={[styles.fade, styles.noTouch]}
              />
              {error ? (
                <View style={styles.error} accessibilityLiveRegion="polite">
                  <AlertCircle size={16} color={Colors.high} strokeWidth={2.4} />
                  <ThemedText style={styles.errorText}>{error}</ThemedText>
                </View>
              ) : null}
              <Button
                label="Save details"
                loading={busy}
                disabled={!changed}
                onPress={submit}
              />
            </View>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    </View>
  );
}

/** One part of the form: a round dish, a title with a quiet line under it, then its inputs. */
function Group({
  title,
  hint,
  icon,
  children,
}: {
  title: string;
  hint?: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <View style={styles.group}>
      <View style={styles.groupHeader}>
        <IconTile icon={icon} size={LEAD} />
        <View style={styles.flex}>
          <ThemedText style={styles.groupTitle} accessibilityRole="header">
            {title}
          </ThemedText>
          {hint ? <ThemedText style={styles.groupHint}>{hint}</ThemedText> : null}
        </View>
      </View>
      {children}
    </View>
  );
}

/** A few of the form's cards while the profile loads. */
function FormSkeleton() {
  return (
    <SkeletonGroup label="Loading your emergency details" style={styles.skeletonStack}>
      {[0, 1, 2].map((i) => (
        <Surface key={i} style={[styles.card, styles.group]}>
          <View style={styles.groupHeader}>
            <SkeletonCircle size={LEAD} />
            <View style={[styles.flex, styles.skeletonText]}>
              <Skeleton width={130} height={15} />
              <Skeleton width="70%" height={11} />
            </View>
          </View>
          <View style={styles.skeletonChips}>
            {[0, 1, 2, 3].map((j) => (
              <Skeleton key={j} width={68} height={38} radius={Radius.pill} />
            ))}
          </View>
        </Surface>
      ))}
    </SkeletonGroup>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.canvas,
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth / 1.5,
    alignSelf: 'center',
  },
  flex: {
    flex: 1,
  },
  noTouch: {
    pointerEvents: 'none',
  },
  content: {
    gap: Spacing.three,
    paddingHorizontal: Gutter,
    paddingTop: Spacing.one,
    paddingBottom: Spacing.four,
  },
  intro: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    paddingHorizontal: 2,
  },
  introText: {
    flex: 1,
    fontFamily: Fonts.medium,
    fontSize: 13.5,
    lineHeight: 19,
    color: Colors.textSoft,
  },
  card: {
    paddingHorizontal: Spacing.three - 2,
    paddingVertical: 0,
  },
  group: {
    gap: Spacing.three - 2,
    paddingVertical: Spacing.three - 2,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
  },
  groupTitle: {
    fontFamily: Fonts.displaySemibold,
    fontSize: 16.5,
    lineHeight: 21,
    letterSpacing: -0.3,
    color: Colors.text,
  },
  groupHint: {
    marginTop: 1,
    fontFamily: Fonts.medium,
    fontSize: 12.5,
    lineHeight: 17,
    color: Colors.textFaint,
  },
  skeletonStack: {
    gap: Spacing.three,
  },
  skeletonText: {
    gap: 8,
  },
  skeletonChips: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  bloodGroups: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  // Four to a row.
  bloodGroup: {
    width: '22%',
    flexGrow: 1,
  },
  choices: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  choice: {
    flex: 1,
  },
  footer: {
    gap: Spacing.two + 2,
    paddingHorizontal: Gutter,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three - 4,
    backgroundColor: Colors.canvas,
  },
  // The last of the form fades into the footer instead of stopping at a hard edge.
  fade: {
    position: 'absolute',
    top: -28,
    left: 0,
    right: 0,
    height: 28,
  },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  errorText: {
    flex: 1,
    fontFamily: Fonts.semibold,
    fontSize: 13.5,
    lineHeight: 19,
    color: Colors.high,
  },
});
