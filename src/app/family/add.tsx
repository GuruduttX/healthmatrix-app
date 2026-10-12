import { router } from 'expo-router';
import { CircleCheck, MessageSquareText, X } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Chip } from '@/components/ui/chip';
import { IconTile } from '@/components/ui/icon-tile';
import { Colors, Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { aboutLine, RELATIONS } from '@/features/family/relations';
import { type FamilyMember, type Relation } from '@/features/family/types';
import { familyApi, useFamily } from '@/features/family/use-family';
import { MemberAvatar } from '@/features/profile/member-avatar';

type Step = 'details' | 'code' | 'done';

/** "9876543210" -> "+91 98765 43210" */
const formatPhone = (phone: string) => `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`;

function Field({ label, prefix, ...input }: TextInputProps & { label: string; prefix?: string }) {
  return (
    <View style={styles.field}>
      <ThemedText type="caption" themeColor="textSecondary" style={styles.label}>
        {label}
      </ThemedText>
      <View style={styles.inputRow}>
        {prefix ? <ThemedText style={styles.prefix}>{prefix}</ThemedText> : null}
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={Colors.textMuted}
          {...input}
          style={[styles.input, input.style]}
        />
      </View>
    </View>
  );
}

function PrimaryButton({
  label,
  onPress,
  disabled,
  busy,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || busy, busy }}
      style={({ pressed }) => [
        styles.button,
        disabled && !busy && styles.buttonDisabled,
        pressed && styles.pressed,
      ]}>
      {busy ? (
        <ActivityIndicator color={Colors.onInk} />
      ) : (
        <ThemedText type="smallBold" themeColor="onInk">
          {label}
        </ThemedText>
      )}
    </Pressable>
  );
}

/**
 * Adds a family member: their name, how they're related and their number; then the code texted
 * to that number, which they read out as their OK; then they're in the family.
 */
export default function AddFamilyMemberScreen() {
  const { added } = useFamily();
  const [step, setStep] = useState<Step>('details');
  const [name, setName] = useState('');
  const [relation, setRelation] = useState<Relation | null>(null);
  const [relationName, setRelationName] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | undefined>();
  const [hasAccount, setHasAccount] = useState(false);
  const [member, setMember] = useState<FamilyMember | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const firstName = name.trim().split(/\s+/)[0] || 'them';
  const phoneValid = /^[6-9]\d{9}$/.test(phone);
  const otherNamed = relation !== 'other' || relationName.trim().length >= 2;
  const canSend = name.trim().length >= 2 && !!relation && otherNamed && phoneValid;
  const close = () => (router.canGoBack() ? router.back() : router.replace('/card'));

  const send = async () => {
    if (!relation) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await familyApi.invite({
        phone,
        name: name.trim(),
        relation,
        ...(relation === 'other' && { relationName: relationName.trim() }),
      });
      setHasAccount(result.hasAccount);
      setDevCode(result.devCode);
      setCode('');
      if (step === 'code') setNotice('A new code is on its way.');
      setStep('code');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send the code. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await familyApi.verify(phone, code);
      added(result.member);
      setMember(result.member);
      setStep('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not check the code. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <ThemedText type="bodyBold">Add family member</ThemedText>
        <Pressable
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={10}
          style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
          <X size={20} color={Colors.text} strokeWidth={2.2} />
        </Pressable>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {step === 'details' ? (
            <>
              <View style={styles.intro}>
                <ThemedText type="subtitle">Who are you adding?</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  We’ll text a code to their phone. When they share it with you, you can see their
                  prescriptions, reports, vaccines and medicines. They can stop this at any time.
                </ThemedText>
              </View>

              <Field
                label="Their name"
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  setError(null);
                }}
                placeholder="Full name"
                autoCapitalize="words"
                autoComplete="off"
                maxLength={60}
                editable={!busy}
                returnKeyType="next"
              />

              <View style={styles.field}>
                <ThemedText type="caption" themeColor="textSecondary" style={styles.label}>
                  They are your
                </ThemedText>
                <View style={styles.relations}>
                  {RELATIONS.map((option) => (
                    <Chip
                      key={option.id}
                      label={option.label}
                      selected={relation === option.id}
                      onPress={() => {
                        setRelation(option.id);
                        setError(null);
                      }}
                    />
                  ))}
                </View>
              </View>

              {relation === 'other' ? (
                <Field
                  label="How are they related to you?"
                  value={relationName}
                  onChangeText={(text) => {
                    setRelationName(text);
                    setError(null);
                  }}
                  placeholder="e.g. Cousin, Uncle, Friend"
                  autoCapitalize="words"
                  autoComplete="off"
                  autoFocus
                  maxLength={30}
                  editable={!busy}
                  returnKeyType="next"
                />
              ) : null}

              <Field
                label="Their mobile number"
                prefix="+91"
                value={phone}
                onChangeText={(text) => {
                  setPhone(text.replace(/\D/g, ''));
                  setError(null);
                }}
                placeholder="10-digit mobile number"
                keyboardType="number-pad"
                autoComplete="off"
                maxLength={10}
                editable={!busy}
                returnKeyType="done"
                onSubmitEditing={canSend ? send : undefined}
              />

              {error ? (
                <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite">
                  {error}
                </ThemedText>
              ) : null}

              <PrimaryButton label="Send code" onPress={send} disabled={!canSend} busy={busy} />
            </>
          ) : step === 'code' ? (
            <>
              <View style={styles.intro}>
                <IconTile icon={MessageSquareText} tone="primary" size={48} />
                <ThemedText type="subtitle">Enter {firstName}’s code</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  We sent a 6-digit code to {formatPhone(phone)}. Ask {firstName} to read it out to
                  you.
                  {hasAccount
                    ? ''
                    : ` ${firstName} isn’t on HealthMatrix yet, so this also makes an account for them that they can sign in to with this number.`}
                </ThemedText>
              </View>

              <Field
                label="Their code"
                value={code}
                onChangeText={(text) => {
                  setCode(text.replace(/\D/g, ''));
                  setError(null);
                }}
                placeholder="6-digit code"
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                editable={!busy}
                returnKeyType="done"
                onSubmitEditing={code.length === 6 ? verify : undefined}
                style={styles.code}
              />

              {error ? (
                <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite">
                  {error}
                </ThemedText>
              ) : null}
              {notice ? (
                <ThemedText type="small" themeColor="success">
                  {notice}
                </ThemedText>
              ) : null}
              {devCode ? (
                <ThemedText type="caption" themeColor="textMuted">
                  Testing only, no SMS was sent: the code is {devCode}
                </ThemedText>
              ) : null}

              <PrimaryButton
                label={`Add ${firstName}`}
                onPress={verify}
                disabled={code.length !== 6}
                busy={busy}
              />

              <View style={styles.links}>
                <Pressable onPress={send} disabled={busy} accessibilityRole="button" hitSlop={8}>
                  <ThemedText type="smallBold" themeColor="primary">
                    Resend code
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setStep('details');
                    setError(null);
                    setNotice(null);
                  }}
                  disabled={busy}
                  accessibilityRole="button"
                  hitSlop={8}>
                  <ThemedText type="smallBold" themeColor="textSecondary">
                    Change number
                  </ThemedText>
                </Pressable>
              </View>
            </>
          ) : member ? (
            <View style={styles.done}>
              <View style={styles.doneAvatar}>
                <MemberAvatar name={member.name} photoUrl={member.photoUrl} size={88} />
                <View style={styles.doneBadge}>
                  <CircleCheck size={22} color={Colors.onInk} strokeWidth={2.4} />
                </View>
              </View>
              <ThemedText type="subtitle" style={styles.center}>
                {member.name} is in your family
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
                {aboutLine(member)}. You can now see their prescriptions, reports, vaccines and
                medicines from your Card.
              </ThemedText>
              <PrimaryButton
                label={`See ${member.name.split(/\s+/)[0]}’s records`}
                onPress={() =>
                  router.replace({ pathname: '/family/[id]', params: { id: member.id } })
                }
              />
              <Pressable
                onPress={close}
                accessibilityRole="button"
                hitSlop={8}
                style={styles.doneLink}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  Done
                </ThemedText>
              </Pressable>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  close: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundSelected,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth / 1.5,
    alignSelf: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
    paddingBottom: Spacing.six,
  },
  intro: {
    gap: Spacing.two,
  },
  field: {
    gap: 6,
  },
  label: {
    fontFamily: Fonts.semibold,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
  },
  prefix: {
    paddingLeft: Spacing.three,
    color: Colors.textSecondary,
    fontFamily: Fonts.semibold,
    fontSize: 16,
  },
  input: {
    flex: 1,
    minHeight: 52,
    padding: Spacing.three,
    color: Colors.text,
    fontFamily: Fonts.medium,
    fontSize: 16,
  },
  code: {
    letterSpacing: 6,
    fontSize: 20,
  },
  relations: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.8,
  },
  links: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  done: {
    alignItems: 'stretch',
    gap: Spacing.three,
    paddingTop: Spacing.five,
  },
  doneAvatar: {
    alignSelf: 'center',
  },
  doneLink: {
    alignSelf: 'center',
  },
  doneBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.background,
    backgroundColor: Colors.success,
  },
  center: {
    textAlign: 'center',
  },
});
