import { router } from 'expo-router';
import { ChevronLeft, ShieldAlert } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Chip } from '@/components/ui/chip';
import { Surface } from '@/components/ui/surface';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { ContactsEditor, type ContactDraft } from '@/features/card/contacts-editor';
import {
  useEmergencyProfile,
  type EmergencyProfile,
  type EmergencyProfileUpdate,
} from '@/features/card/emergency-profile';
import { formStyles } from '@/features/card/form-styles';
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
  const { profile, error: loadError, save } = useEmergencyProfile();
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

  const canSave = changed && !busy;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <Pressable
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={8}
          style={({ pressed }) => [styles.back, pressed && formStyles.pressed]}>
          <ChevronLeft size={20} color={Colors.text} strokeWidth={2.2} />
        </Pressable>
        <ThemedText type="bodyBold">Emergency details</ThemedText>
        <View style={styles.back} />
      </View>

      {!form ? (
        <View style={styles.loading}>
          {loadError ? (
            <ThemedText type="small" themeColor="danger">
              {loadError}
            </ThemedText>
          ) : (
            <ActivityIndicator color={Colors.textSecondary} />
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
              <ShieldAlert size={18} color={Colors.primary} strokeWidth={2.2} />
              <ThemedText type="small" style={styles.flexText}>
                Anyone who scans your QR sees these details, but only the fields you switch on in
                My card.
              </ThemedText>
            </View>

            <Section title="Blood group">
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
              <Section key={key} title={LISTS[key].label} hint={LISTS[key].hint}>
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
              hint="Family or friends to call first. A responder can call them from the page.">
              <ContactsEditor
                contacts={form.contacts}
                onChange={(contacts) => edit({ contacts })}
                editable={!busy}
              />
            </Section>

            <Section title="Organ donor">
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

            <Section title="Health insurance">
              <TextInput
                value={form.insuranceProvider}
                onChangeText={(insuranceProvider) => edit({ insuranceProvider })}
                placeholder="Insurer, e.g. Star Health"
                placeholderTextColor={Colors.textMuted}
                maxLength={60}
                editable={!busy}
                style={formStyles.input}
              />
              <TextInput
                value={form.policyNumber}
                onChangeText={(policyNumber) => edit({ policyNumber })}
                placeholder="Policy number (optional)"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={40}
                editable={!busy}
                style={formStyles.input}
              />
            </Section>

            {error ? (
              <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite">
                {error}
              </ThemedText>
            ) : null}

            <Pressable
              onPress={submit}
              disabled={!canSave}
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSave, busy }}
              style={({ pressed }) => [
                styles.save,
                !canSave && !busy && styles.saveDisabled,
                pressed && formStyles.pressed,
              ]}>
              {busy ? (
                <ActivityIndicator color={Colors.onInk} />
              ) : (
                <ThemedText type="smallBold" themeColor="onInk">
                  Save details
                </ThemedText>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <Surface style={styles.section}>
      <View style={styles.sectionHeader}>
        <ThemedText type="bodyBold">{title}</ThemedText>
        {hint ? (
          <ThemedText type="caption" themeColor="textSecondary">
            {hint}
          </ThemedText>
        ) : null}
      </View>
      {children}
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
    width: '100%',
    maxWidth: MaxContentWidth / 1.5,
  },
  flexText: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: MaxContentWidth / 1.5,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.three,
  },
  content: {
    gap: Spacing.three,
    padding: Spacing.three,
    paddingBottom: Spacing.five,
  },
  intro: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    padding: Spacing.two + 4,
    borderRadius: Radius.md,
    backgroundColor: Colors.primarySoft,
  },
  section: {
    gap: Spacing.two + 4,
    padding: Spacing.three,
  },
  sectionHeader: {
    gap: 2,
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
  save: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
  },
  saveDisabled: {
    opacity: 0.4,
  },
});
