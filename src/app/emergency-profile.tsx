import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  Activity,
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
import { IconTile, type Tone } from '@/components/ui/icon-tile';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { StackHeader } from '@/components/ui/stack-header';
import { Surface } from '@/components/ui/surface';
import { TextField } from '@/components/ui/text-field';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
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

/** The icon and colour beside each list's title. */
const LIST_ICONS: Record<ListKey, { icon: LucideIcon; tone: Tone }> = {
  allergies: { icon: TriangleAlert, tone: 'warning' },
  conditions: { icon: Activity, tone: 'primary' },
  medicines: { icon: Pill, tone: 'success' },
};

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
      <LinearGradient
        colors={['rgba(254, 241, 234, 0.9)', 'rgba(243, 247, 247, 0)']}
        style={styles.wash}
        pointerEvents="none"
      />
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
                <View style={styles.introIcon}>
                  <ShieldAlert size={18} color={Colors.primary} strokeWidth={2.2} />
                </View>
                <ThemedText type="small" style={styles.flexText}>
                  Anyone who scans your QR sees these details, but only the fields you switch on in
                  My card.
                </ThemedText>
              </View>

              <Section title="Blood group" icon={Droplet} tone="danger">
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
              </Section>

              {(Object.keys(LISTS) as ListKey[]).map((key) => (
                <Section
                  key={key}
                  title={LISTS[key].label}
                  hint={LISTS[key].hint}
                  icon={LIST_ICONS[key].icon}
                  tone={LIST_ICONS[key].tone}>
                  <ListEditor
                    items={form[key]}
                    onChange={(items) => edit({ [key]: items })}
                    draft={drafts[key]}
                    onDraftChange={editDraft(key)}
                    placeholder={LISTS[key].placeholder}
                    suggestions={[...LISTS[key].suggestions]}
                    editable={!busy}
                  />
                </Section>
              ))}

              <Section
                title="Emergency contacts"
                hint="Family or friends to call first. A responder can call them from the page."
                icon={Phone}
                tone="success">
                <ContactsEditor
                  contacts={form.contacts}
                  onChange={(contacts) => edit({ contacts })}
                  editable={!busy}
                />
              </Section>

              <Section title="Organ donor" icon={HeartHandshake} tone="danger">
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
                            organDonor: form.organDonor === option.value ? undefined : option.value,
                          })
                        }
                      />
                    </View>
                  ))}
                </View>
              </Section>

              <Section title="Health insurance" icon={ShieldCheck} tone="neutral">
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
              </Section>

              {error ? (
                <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite">
                  {error}
                </ThemedText>
              ) : null}

              <Button
                label="Save details"
                loading={busy}
                disabled={!changed}
                onPress={submit}
              />
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    </View>
  );
}

/** One part of the form on a white card, with an icon beside its title. */
function Section({
  title,
  hint,
  icon,
  tone = 'primary',
  children,
}: {
  title: string;
  hint?: string;
  icon?: LucideIcon;
  tone?: Tone;
  children: ReactNode;
}) {
  return (
    <Surface style={styles.section}>
      <View style={styles.sectionHeader}>
        {icon ? <IconTile icon={icon} tone={tone} size={36} /> : null}
        <View style={styles.flexText}>
          <ThemedText type="bodyBold">{title}</ThemedText>
          {hint ? (
            <ThemedText type="caption" themeColor="textSecondary">
              {hint}
            </ThemedText>
          ) : null}
        </View>
      </View>
      {children}
    </Surface>
  );
}

/** A few of the form's cards while the profile loads. */
function FormSkeleton() {
  return (
    <SkeletonGroup label="Loading your emergency details" style={styles.skeletonStack}>
      {[0, 1, 2].map((i) => (
        <Surface key={i} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Skeleton width={36} height={36} radius={Radius.md} />
            <Skeleton width={130} height={15} />
          </View>
          <View style={styles.skeletonChips}>
            {[0, 1, 2, 3].map((j) => (
              <Skeleton key={j} width={70} height={36} radius={Radius.pill} />
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
    backgroundColor: Colors.background,
  },
  wash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 280,
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
  flexText: {
    flex: 1,
  },
  content: {
    gap: Spacing.three,
    padding: Spacing.three,
    paddingTop: Spacing.one,
    paddingBottom: Spacing.five,
  },
  intro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 4,
    padding: 14,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(221, 67, 1, 0.14)',
    backgroundColor: Colors.primarySoft,
  },
  introIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundElement,
  },
  section: {
    gap: Spacing.three - 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 4,
  },
  skeletonStack: {
    gap: Spacing.three,
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
});
