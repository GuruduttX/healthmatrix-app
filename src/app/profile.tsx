import { router, useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { BadgeCheck, Camera, CircleCheck, Lock, LogOut, ShieldCheck } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { HeroBackground } from '@/components/ui/hero-background';
import { StackHeader } from '@/components/ui/stack-header';
import { Surface } from '@/components/ui/surface';
import { TextField } from '@/components/ui/text-field';
import { Plans } from '@/constants/plans';
import { Colors, Fonts, MaxContentWidth, Radius, Shadows, Spacing } from '@/constants/theme';
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

/** Brand green, lifted so it reads on ink. */
const ABHA_GREEN = '#7FD6C2';

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
  // Light status bar text over the dark header, only while this screen is showing.
  const focused = useIsFocused();

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
      {focused ? <StatusBar style="light" /> : null}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}>
          {/* Who you are, on the same dark header as the tabs. */}
          <View style={styles.hero}>
            <HeroBackground />
            <View style={[styles.heroInner, { paddingTop: insets.top }]}>
              <StackHeader
                onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
                title="Profile"
                tone="dark"
              />
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
                      size={104}
                    />
                  </View>
                  <View style={styles.cameraBadge}>
                    <Camera size={16} color={Colors.onInk} strokeWidth={2.2} />
                  </View>
                </Pressable>
                <ThemedText style={styles.name} numberOfLines={1}>
                  {trimmedName || member.name}
                </ThemedText>
                <ThemedText type="caption" style={styles.memberId}>
                  Member ID {formatMemberId(member.memberId)}
                </ThemedText>
                <View style={styles.badges}>
                  <View style={styles.badge}>
                    <BadgeCheck size={13} color={Colors.primaryLight} strokeWidth={2.4} />
                    <ThemedText style={[styles.badgeText, { color: Colors.primaryLight }]}>
                      {Plans[member.plan].name} plan
                    </ThemedText>
                  </View>
                  {member.abhaLinked ? (
                    <View style={styles.badge}>
                      <ShieldCheck size={13} color={ABHA_GREEN} strokeWidth={2.4} />
                      <ThemedText style={[styles.badgeText, { color: ABHA_GREEN }]}>
                        ABHA linked
                      </ThemedText>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>
          </View>

          <View style={styles.content}>
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
              <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite">
                {error}
              </ThemedText>
            ) : null}
            {saved && !changed ? (
              <View style={styles.saved} accessibilityLiveRegion="polite">
                <CircleCheck size={16} color={Colors.success} strokeWidth={2.4} />
                <ThemedText type="smallBold" themeColor="success">
                  Your profile is updated.
                </ThemedText>
              </View>
            ) : null}

            <Button label="Save changes" loading={busy} disabled={!canSave} onPress={save} />

            <Button
              label="Sign out"
              variant="danger"
              icon={LogOut}
              loading={signingOut}
              disabled={busy}
              onPress={signOutNow}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
      <ThemedText type="caption" themeColor="textSecondary" style={styles.label}>
        {label}
      </ThemedText>
      {children}
      {error ? (
        <ThemedText type="caption" themeColor="danger">
          {error}
        </ThemedText>
      ) : hint ? (
        <ThemedText type="caption" themeColor="textMuted">
          {hint}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    paddingBottom: Spacing.five,
  },
  pressed: {
    opacity: 0.75,
  },
  hero: {
    paddingBottom: Spacing.five + Spacing.three,
  },
  heroInner: {
    width: '100%',
    maxWidth: MaxContentWidth / 1.5,
    alignSelf: 'center',
  },
  identity: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.three,
  },
  photoRing: {
    padding: 4,
    borderRadius: 58,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
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
    borderColor: Colors.ink,
    backgroundColor: Colors.primary,
  },
  name: {
    marginTop: Spacing.two + 2,
    fontFamily: Fonts.display,
    fontSize: 24,
    lineHeight: 30,
    color: Colors.onInk,
    textAlign: 'center',
  },
  memberId: {
    color: Colors.onInkMuted,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    backgroundColor: Colors.glass,
  },
  badgeText: {
    fontFamily: Fonts.semibold,
    fontSize: 12,
    lineHeight: 16,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth / 1.5,
    alignSelf: 'center',
    gap: Spacing.three,
    marginTop: -Spacing.five,
    paddingHorizontal: Spacing.three,
  },
  card: {
    gap: Spacing.three,
    boxShadow: Shadows.lifted,
  },
  field: {
    gap: 6,
  },
  label: {
    fontFamily: Fonts.semibold,
  },
  genders: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  gender: {
    flex: 1,
  },
  saved: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
});
