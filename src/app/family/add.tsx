import { router } from 'expo-router';
import {
  AlertCircle,
  Check,
  CircleCheck,
  MessageSquareText,
  type LucideIcon,
} from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Dish } from '@/components/ui/dish';
import { Glass, glassSurface } from '@/components/ui/glass';
import { PageBackground } from '@/components/ui/morning-light';
import { StackHeader } from '@/components/ui/stack-header';
import { Surface } from '@/components/ui/surface';
import { TextField } from '@/components/ui/text-field';
import { Colors, Fonts, Gutter, MaxContentWidth, Spacing } from '@/constants/theme';
import { aboutLine, RELATIONS } from '@/features/family/relations';
import { type FamilyMember, type Relation } from '@/features/family/types';
import { familyApi, useFamily } from '@/features/family/use-family';
import { MemberAvatar } from '@/features/profile/member-avatar';

type Step = 'details' | 'code' | 'done';

/** "9876543210" -> "+91 98765 43210" */
const formatPhone = (phone: string) => `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`;

const DISH = 52;
const PHOTO = 84;

/** A step's heading: an optional round picture, the question, and a quiet line under it. */
function Intro({ lead, title, children }: { lead?: ReactNode; title: string; children: ReactNode }) {
  return (
    <View style={styles.intro}>
      {lead}
      <ThemedText style={styles.title} accessibilityRole="header">
        {title}
      </ThemedText>
      <ThemedText style={styles.body}>{children}</ThemedText>
    </View>
  );
}

/** A line under the form: what went wrong, or that a new code is coming. Icon and words both. */
function Message({ tone, children }: { tone: 'error' | 'ok'; children: ReactNode }) {
  const Icon: LucideIcon = tone === 'error' ? AlertCircle : CircleCheck;
  const color = tone === 'error' ? Colors.high : Colors.good;
  return (
    <View style={styles.message} accessibilityLiveRegion="polite">
      <View style={styles.messageIcon}>
        <Icon size={15} color={color} strokeWidth={2.4} />
      </View>
      <ThemedText style={[styles.messageText, { color }]}>{children}</ThemedText>
    </View>
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
    <View style={styles.screen}>
      <PageBackground />
      <SafeAreaView style={styles.flex}>
        <StackHeader onBack={close} close title="Add family member" />

        <KeyboardAvoidingView style={styles.flex} behavior="padding">
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {step === 'details' ? (
              <>
                <Intro title="Who are you adding?">
                  We’ll text a code to their phone. When they share it with you, you can see their
                  prescriptions, reports, vaccines and medicines. They can stop this at any time.
                </Intro>

                <Surface style={styles.card}>
                  <TextField
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
                    <ThemedText style={styles.label}>They are your</ThemedText>
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
                    <TextField
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

                  <TextField
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
                </Surface>

                {error ? <Message tone="error">{error}</Message> : null}

                <Button label="Send code" onPress={send} disabled={!canSend} loading={busy} />
              </>
            ) : step === 'code' ? (
              <>
                <Intro
                  lead={
                    <Dish size={DISH} tint="warm" lifted style={styles.dish}>
                      <MessageSquareText size={23} color={Colors.primaryDeep} strokeWidth={2.1} />
                    </Dish>
                  }
                  title={`Enter ${firstName}’s code`}>
                  We sent a 6-digit code to {formatPhone(phone)}. Ask {firstName} to read it out to
                  you.
                  {hasAccount
                    ? ''
                    : ` ${firstName} isn’t on HealthMatrix yet, so this also makes an account for them that they can sign in to with this number.`}
                </Intro>

                <Surface style={styles.card}>
                  <TextField
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
                    // Spaced digits once typed; the placeholder keeps normal spacing.
                    style={code ? styles.code : undefined}
                  />
                  {devCode ? (
                    <ThemedText style={styles.devCode}>
                      Testing only, no SMS was sent: the code is {devCode}
                    </ThemedText>
                  ) : null}
                </Surface>

                {error ? <Message tone="error">{error}</Message> : null}
                {notice ? <Message tone="ok">{notice}</Message> : null}

                <Button
                  label={`Add ${firstName}`}
                  onPress={verify}
                  disabled={code.length !== 6}
                  loading={busy}
                />

                <View style={styles.links}>
                  <Pressable
                    onPress={send}
                    disabled={busy}
                    accessibilityRole="button"
                    hitSlop={8}
                    style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
                    <ThemedText style={[styles.linkText, styles.linkPrimary]}>
                      Resend code
                    </ThemedText>
                  </Pressable>
                  <View style={styles.linkDot} />
                  <Pressable
                    onPress={() => {
                      setStep('details');
                      setError(null);
                      setNotice(null);
                    }}
                    disabled={busy}
                    accessibilityRole="button"
                    hitSlop={8}
                    style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
                    <ThemedText style={styles.linkText}>Change number</ThemedText>
                  </Pressable>
                </View>
              </>
            ) : member ? (
              <>
                {/* The margin sits on the pane's outer box, which carries its lift. */}
                <Glass style={styles.done} wrapperStyle={styles.doneSpace}>
                  <View style={[glassSurface.small, styles.photoRing]}>
                    <MemberAvatar
                      name={member.name}
                      photoUrl={member.photoUrl}
                      size={PHOTO}
                      tone="glass"
                    />
                    <View style={styles.doneBadge}>
                      <Check size={16} color={Colors.onInk} strokeWidth={3.2} />
                    </View>
                  </View>
                  <ThemedText
                    style={[styles.doneTitle, styles.centerText]}
                    accessibilityRole="header">
                    {member.name} is in your family
                  </ThemedText>
                  <ThemedText style={[styles.body, styles.centerText]}>
                    {aboutLine(member)}. You can now see their prescriptions, reports, vaccines and
                    medicines from your Card.
                  </ThemedText>
                </Glass>
                <View style={styles.doneActions}>
                  <Button
                    label={`See ${member.name.split(/\s+/)[0]}’s records`}
                    onPress={() =>
                      router.replace({ pathname: '/family/[id]', params: { id: member.id } })
                    }
                  />
                  <Button label="Done" variant="secondary" onPress={close} />
                </View>
              </>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  centerText: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth / 1.5,
    alignSelf: 'center',
    gap: Spacing.four - 4,
    paddingHorizontal: Gutter,
    paddingTop: Spacing.one,
    paddingBottom: Spacing.six,
  },
  intro: {
    gap: Spacing.one + 2,
  },
  title: {
    fontFamily: Fonts.displaySemibold,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.5,
    color: Colors.text,
  },
  doneTitle: {
    fontFamily: Fonts.displaySemibold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.4,
    color: Colors.text,
  },
  body: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSoft,
  },
  // The step's picture, lifted like Home's quick actions: a warm dish of glass.
  dish: {
    alignSelf: 'flex-start',
    marginBottom: Spacing.two,
  },
  card: {
    gap: Spacing.three + 2,
  },
  field: {
    gap: 8,
  },
  // Matches the text fields' own labels.
  label: {
    fontFamily: Fonts.semibold,
    fontSize: 13,
    lineHeight: 17,
    color: Colors.textSoft,
  },
  relations: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  code: {
    letterSpacing: 6,
    fontSize: 20,
  },
  devCode: {
    marginTop: -Spacing.two,
    fontFamily: Fonts.medium,
    fontSize: 12.5,
    lineHeight: 17,
    color: Colors.textFaint,
  },
  message: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginVertical: -Spacing.one,
  },
  messageIcon: {
    marginTop: 2,
  },
  messageText: {
    flex: 1,
    fontFamily: Fonts.semibold,
    fontSize: 13.5,
    lineHeight: 19,
  },
  links: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three - 4,
    marginTop: -Spacing.one,
  },
  link: {
    minHeight: 40,
    justifyContent: 'center',
  },
  linkText: {
    fontFamily: Fonts.semibold,
    fontSize: 14.5,
    lineHeight: 19,
    color: Colors.textSoft,
  },
  linkPrimary: {
    color: Colors.primaryDeep,
  },
  linkDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.textMuted,
  },
  doneSpace: {
    marginTop: Spacing.three,
  },
  done: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.four - 4,
    paddingHorizontal: Spacing.four - 4,
  },
  // A ring of glass around the photo, as on Home's family strip.
  photoRing: {
    marginBottom: Spacing.two,
    padding: 3,
    borderRadius: PHOTO / 2 + 4,
  },
  doneBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.backgroundElement,
    backgroundColor: Colors.good,
  },
  doneActions: {
    gap: Spacing.two + 2,
  },
});
