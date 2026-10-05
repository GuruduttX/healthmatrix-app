import { router } from 'expo-router';
import { Camera, ChevronLeft, Lock } from 'lucide-react-native';
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

/** "HM 4829 1057 3316" */
function formatMemberId(id: string) {
  return `HM ${id.replace(/(\d{4})(?=\d)/g, '$1 ')}`;
}

/** "+91 98765 43210" */
function formatPhone(phone: string) {
  return `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`;
}

/** The signed-in member's profile: photo, name, number, email and gender. */
export default function ProfileScreen() {
  const { member, updateMember } = useAuth();

  const [name, setName] = useState(member?.name ?? '');
  const [email, setEmail] = useState(member?.email ?? '');
  const [gender, setGender] = useState<Gender | undefined>(member?.gender);
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={8}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
          <ChevronLeft size={20} color={Colors.text} strokeWidth={2.2} />
        </Pressable>
        <ThemedText type="bodyBold">Profile</ThemedText>
        <View style={styles.back} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}>
          <View style={styles.hero}>
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
                  size={112}
                />
              </View>
              <View style={styles.cameraBadge}>
                <Camera size={16} color={Colors.onInk} strokeWidth={2.2} />
              </View>
            </Pressable>
            <ThemedText type="subtitle" style={styles.center} numberOfLines={1}>
              {trimmedName || member.name}
            </ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              Member ID {formatMemberId(member.memberId)}
            </ThemedText>
          </View>

          <Surface style={styles.card}>
            <Field label="Full name" error={trimmedName ? nameError : null}>
              <TextInput
                value={name}
                onChangeText={edit(setName)}
                placeholder="Your name"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
                maxLength={60}
                editable={!busy}
                style={styles.input}
              />
            </Field>

            <Field label="Mobile number" hint="This is your login, so it can't be changed here.">
              <View style={[styles.input, styles.readOnly]}>
                <ThemedText style={styles.readOnlyText}>{formatPhone(member.phone)}</ThemedText>
                <Lock size={15} color={Colors.textMuted} strokeWidth={2.2} />
              </View>
            </Field>

            <Field label="Email" error={emailError}>
              <TextInput
                value={email}
                onChangeText={edit(setEmail)}
                placeholder="you@example.com"
                placeholderTextColor={Colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                maxLength={120}
                editable={!busy}
                style={styles.input}
              />
            </Field>

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
            <ThemedText type="small" themeColor="success" accessibilityLiveRegion="polite">
              Your profile is updated.
            </ThemedText>
          ) : null}

          <Pressable
            onPress={save}
            disabled={!canSave}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSave, busy }}
            style={({ pressed }) => [
              styles.save,
              !canSave && !busy && styles.saveDisabled,
              pressed && styles.pressed,
            ]}>
            {busy ? (
              <ActivityIndicator color={Colors.onInk} />
            ) : (
              <ThemedText type="smallBold" themeColor="onInk">
                Save changes
              </ThemedText>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  pressed: {
    opacity: 0.75,
  },
  content: {
    gap: Spacing.three,
    padding: Spacing.three,
    paddingBottom: Spacing.five,
  },
  hero: {
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two,
  },
  photoRing: {
    padding: 4,
    borderRadius: 60,
    backgroundColor: Colors.backgroundElement,
    boxShadow: Shadows.card,
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
    borderColor: Colors.background,
    backgroundColor: Colors.primary,
  },
  center: {
    marginTop: Spacing.two,
    textAlign: 'center',
  },
  card: {
    gap: Spacing.three,
    padding: Spacing.three,
  },
  field: {
    gap: 6,
  },
  label: {
    fontFamily: Fonts.semibold,
  },
  input: {
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
    color: Colors.text,
    fontFamily: Fonts.medium,
    fontSize: 16,
  },
  readOnly: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
  },
  readOnlyText: {
    fontFamily: Fonts.medium,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  genders: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  gender: {
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
