import { router } from 'expo-router';
import {
  AlertCircle,
  BadgeCheck,
  Camera,
  CircleCheck,
  Lock,
  LogOut,
  ShieldCheck,
} from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { PageBackground } from '@/components/ui/morning-light';
import { StackHeader } from '@/components/ui/stack-header';
import { Surface } from '@/components/ui/surface';
import { Tag } from '@/components/ui/tag';
import { TextField } from '@/components/ui/text-field';
import { Plans } from '@/constants/plans';
import { Colors, Fonts, Gutter, MaxContentWidth, Shadows, Spacing } from '@/constants/theme';
import { authApi } from '@/features/auth/auth-api';
import { useAuth } from '@/features/auth/auth-context';
import { MemberAvatar } from '@/features/profile/member-avatar';
import { pickProfilePhoto, type PickedPhoto } from '@/features/profile/pick-photo';
import { type Gender } from '@/types';

const GENDERS: { id: Gender; label: string }[] = [
  { id: 'male', label: 'Male' },
  { id: 'female', label: 'Female' },
  { id: 'other', label: 'Other' },
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PHOTO = 104;

/** "HM 4829 1057 3316" */
function formatMemberId(id: string) {
  return `HM ${id.replace(/(\d{4})(?=\d)/g, '$1 ')}`;
}

/** "+91 98765 43210" */
function formatPhone(phone: string) {
  return `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`;
}

function confirmSignOut() {
  const message = 'You will need an OTP sent to your phone to sign in again.';
  if (Platform.OS === 'web') {
    return Promise.resolve(globalThis.confirm?.(`Sign out?\n\n${message}`) ?? false);
  }
  return new Promise<boolean>((resolve) =>
    Alert.alert('Sign out?', message, [
      { text: 'Stay signed in', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Sign out', style: 'destructive', onPress: () => resolve(true) },
    ]),
  );
}

/** The signed-in member's profile: photo, name, number, email and gender. */
export default function ProfileScreen() {
  const { member, updateMember, signOut } = useAuth();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState(member?.name ?? '');
  const [email, setEmail] = useState(member?.email ?? '');
  const [gender, setGender] = useState<Gender | undefined>(member?.gender);
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  if (!member) return null;

  const trimmedName = name.trim();
  const trimmedEmail = email.trim().toLowerCase();
  const fieldsChanged =
    trimmedName !== member.name ||
    trimmedEmail !== (member.email ?? '') ||
    gender !== member.gender;
  const changed = fieldsChanged || photo !== null;

  const nameError = trimmedName.length < 2 ? 'Enter your name' : null;
  const emailError =
    trimmedEmail && !EMAIL_PATTERN.test(trimmedEmail) ? 'Enter a valid email address' : null;
  const canSave = changed && !nameError && !emailError && !busy;

  const edit =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value);
      setSaved(false);
      setError(null);
    };

  const choosePhoto = async () => {
    try {
      const picked = await pickProfilePhoto();
      if (picked) edit(setPhoto)(picked);
    } catch {
      setError('Could not open that photo. Try another one.');
    }
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      let next = member;
      if (photo) next = (await authApi.uploadPhoto(photo.base64)).member;
      if (fieldsChanged) {
        next = (
          await authApi.updateProfile({
            name: trimmedName,
            email: trimmedEmail,
            gender: gender ?? null,
          })
        ).member;
      }
      await updateMember(next);
      setPhoto(null);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your profile. Try again.');
    } finally {
      setBusy(false);
    }
  };

  // Signing out swaps every screen for the sign-in stack, so there is nothing to navigate to.
  const signOutNow = async () => {
    if (!(await confirmSignOut())) return;
    setSigningOut(true);
    await signOut();
  };

  return (
    <View style={styles.screen}>
      <PageBackground />
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StackHeader
          onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          title="Profile"
        />
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[
              styles.content,
              { paddingBottom: insets.bottom + Spacing.four },
            ]}>
            {/* Who you are: the photo (tap to change it), name, member ID and plan. */}
            <View style={styles.identity}>
              <Pressable
                onPress={choosePhoto}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel="Change profile photo"
                style={({ pressed }) => pressed && styles.pressed}>
                <View style={styles.photoRing}>
                  <MemberAvatar
                    name={trimmedName || member.name}
                    photoUrl={member.photoUrl}
                    localUri={photo?.uri}
                    size={PHOTO}
                  />
                </View>
                <View style={styles.cameraBadge}>
                  <Camera size={15} color={Colors.onInk} strokeWidth={2.4} />
                </View>
              </Pressable>
              <View style={styles.names}>
                <ThemedText style={styles.name} numberOfLines={1}>
                  {trimmedName || member.name}
                </ThemedText>
                <ThemedText style={styles.memberId} numberOfLines={1}>
                  Member ID {formatMemberId(member.memberId)}
                </ThemedText>
              </View>
              <View style={styles.badges}>
                <Tag label={`${Plans[member.plan].name} plan`} icon={BadgeCheck} />
                {member.abhaLinked ? (
                  <Tag label="ABHA linked" icon={ShieldCheck} tone="success" />
                ) : null}
              </View>
            </View>

            <Surface style={styles.card}>
              <TextField
                label="Full name"
                value={name}
                onChangeText={edit(setName)}
                placeholder="Your name"
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
                maxLength={60}
                editable={!busy}
                error={trimmedName ? nameError : null}
              />

              <TextField
                label="Mobile number"
                value={formatPhone(member.phone)}
                editable={false}
                hint="This is your login, so it can’t be changed here."
                trailing={<Lock size={15} color={Colors.textMuted} strokeWidth={2.2} />}
              />

              <TextField
                label="Email"
                value={email}
                onChangeText={edit(setEmail)}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                maxLength={120}
                editable={!busy}
                error={emailError}
              />

              <Field label="Gender">
                <View style={styles.genders}>
                  {GENDERS.map((option) => (
                    <View key={option.id} style={styles.gender}>
                      <Chip
                        label={option.label}
                        selected={gender === option.id}
                        onPress={() => edit(setGender)(option.id)}
                      />
                    </View>
                  ))}
                </View>
              </Field>
            </Surface>

            {error ? (
              <View style={styles.message} accessibilityLiveRegion="polite">
                <AlertCircle size={16} color={Colors.high} strokeWidth={2.4} />
                <ThemedText style={[styles.messageText, styles.errorText]}>{error}</ThemedText>
              </View>
            ) : null}
            {saved && !changed ? (
              <View style={[styles.message, styles.center]} accessibilityLiveRegion="polite">
                <CircleCheck size={16} color={Colors.good} strokeWidth={2.4} />
                <ThemedText style={[styles.messageText, styles.savedText]}>
                  Your profile is updated.
                </ThemedText>
              </View>
            ) : null}

            <Button label="Save changes" loading={busy} disabled={!canSave} onPress={save} />

            {/* Quiet, away from Save: crimson words, no box. */}
            <Pressable
              onPress={signOutNow}
              disabled={busy || signingOut}
              accessibilityRole="button"
              accessibilityState={{ disabled: busy || signingOut, busy: signingOut }}
              style={({ pressed }) => [
                styles.signOut,
                busy && styles.disabled,
                pressed && styles.pressed,
              ]}>
              {signingOut ? (
                <ActivityIndicator size="small" color={Colors.high} />
              ) : (
                <LogOut size={16} color={Colors.high} strokeWidth={2.4} />
              )}
              <ThemedText style={styles.signOutText}>Sign out</ThemedText>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <View style={styles.field}>
      <ThemedText style={styles.label}>{label}</ThemedText>
      {children}
      {error ? (
        <ThemedText style={[styles.note, styles.errorText]}>{error}</ThemedText>
      ) : hint ? (
        <ThemedText style={styles.note}>{hint}</ThemedText>
      ) : null}
    </View>
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
  content: {
    width: '100%',
    maxWidth: MaxContentWidth / 1.5,
    alignSelf: 'center',
    gap: Spacing.four - 4,
    paddingHorizontal: Gutter,
    paddingTop: Spacing.one,
  },
  pressed: {
    opacity: 0.75,
  },
  disabled: {
    opacity: 0.45,
  },
  center: {
    justifyContent: 'center',
  },
  identity: {
    alignItems: 'center',
    gap: Spacing.three - 4,
  },
  // A white ring and a soft lift, so the photo sits on the page like Home's round buttons.
  photoRing: {
    padding: 4,
    borderRadius: PHOTO / 2 + 4,
    backgroundColor: Colors.backgroundElement,
    boxShadow: Shadows.raised,
  },
  cameraBadge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.backgroundElement,
    backgroundColor: Colors.primaryBright,
    boxShadow: Shadows.soft,
  },
  names: {
    alignItems: 'center',
    gap: 2,
  },
  name: {
    fontFamily: Fonts.displaySemibold,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.5,
    color: Colors.text,
    textAlign: 'center',
  },
  memberId: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textFaint,
    fontVariant: ['tabular-nums'],
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  card: {
    gap: Spacing.three,
  },
  field: {
    gap: 6,
  },
  // Same as a TextField's label and note.
  label: {
    fontFamily: Fonts.semibold,
    fontSize: 13,
    lineHeight: 17,
    color: Colors.textSoft,
  },
  note: {
    fontFamily: Fonts.medium,
    fontSize: 12.5,
    lineHeight: 17,
    color: Colors.textFaint,
  },
  errorText: {
    fontFamily: Fonts.semibold,
    color: Colors.high,
  },
  genders: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  gender: {
    flex: 1,
  },
  message: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  messageText: {
    flexShrink: 1,
    fontSize: 13.5,
    lineHeight: 19,
  },
  savedText: {
    fontFamily: Fonts.bold,
    color: Colors.good,
  },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    gap: 7,
    minHeight: 44,
    marginTop: -Spacing.one,
    paddingHorizontal: Spacing.three,
  },
  signOutText: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    lineHeight: 20,
    color: Colors.high,
  },
});
