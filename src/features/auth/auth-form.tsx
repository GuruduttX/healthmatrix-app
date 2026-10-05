import { Image } from 'expo-image';
import { type ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';

type AuthFormProps = {
  title: string;
  subtitle: string;
  /** Shown between the subtitle and the fields, e.g. the log in / create account switch. */
  beforeFields?: ReactNode;
  /** One text field per entry, top to bottom. Number pad unless a field says otherwise. */
  fields: TextInputProps[];
  buttonLabel: string;
  canSubmit: boolean;
  onSubmit: () => void;
  /** Shown under the fields, e.g. a wrong code. */
  error?: string | null;
  /** True while the request is in flight: shows a spinner and blocks a second submit. */
  busy?: boolean;
  /** Extra content under the button, e.g. "Resend code". */
  footer?: ReactNode;
};

/** Shared layout for the sign-in steps: logo, heading, fields, one button. */
export function AuthForm({
  title,
  subtitle,
  beforeFields,
  fields,
  buttonLabel,
  canSubmit,
  onSubmit,
  error,
  busy = false,
  footer,
}: AuthFormProps) {
  const enabled = canSubmit && !busy;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Image
          source={require('@/assets/images/logo-mark.png')}
          style={styles.logo}
          contentFit="contain"
        />
        <ThemedText type="title">{title}</ThemedText>
        <ThemedText themeColor="textSecondary">{subtitle}</ThemedText>

        {beforeFields ? <View style={styles.beforeFields}>{beforeFields}</View> : null}

        <View style={[styles.fields, beforeFields ? styles.fieldsAfterSlot : null]}>
          {fields.map((field, index) => {
            const isLast = index === fields.length - 1;
            return (
              <TextInput
                key={field.nativeID ?? index}
                placeholderTextColor={Colors.textMuted}
                keyboardType="number-pad"
                returnKeyType={isLast ? 'done' : 'next'}
                onSubmitEditing={isLast && enabled ? onSubmit : undefined}
                editable={!busy}
                {...field}
                style={[styles.input, field.style]}
              />
            );
          })}
        </View>

        {error ? (
          <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite">
            {error}
          </ThemedText>
        ) : null}

        <Pressable
          disabled={!enabled}
          onPress={onSubmit}
          accessibilityRole="button"
          accessibilityState={{ disabled: !enabled, busy }}
          style={({ pressed }) => [
            styles.button,
            !canSubmit && styles.buttonDisabled,
            pressed && styles.buttonPressed,
          ]}>
          {busy ? (
            <ActivityIndicator color={Colors.onInk} />
          ) : (
            <ThemedText type="smallBold" themeColor="onInk">
              {buttonLabel}
            </ThemedText>
          )}
        </Pressable>

        {footer}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth / 2,
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.two,
  },
  logo: {
    width: 64,
    height: 57,
    marginBottom: Spacing.three,
  },
  beforeFields: {
    marginTop: Spacing.three,
  },
  fields: {
    gap: Spacing.two + 2,
    marginTop: Spacing.three,
  },
  fieldsAfterSlot: {
    marginTop: Spacing.one,
  },
  input: {
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
    color: Colors.text,
    fontFamily: Fonts.medium,
    fontSize: 16,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
    marginTop: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonPressed: {
    opacity: 0.85,
  },
});
