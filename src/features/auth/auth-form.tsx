import { Image } from 'expo-image';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  type TextInputProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';

type AuthFormProps = {
  title: string;
  subtitle: string;
  input: TextInputProps;
  buttonLabel: string;
  canSubmit: boolean;
  onSubmit: () => void;
};

/** Shared layout for the sign-in steps: logo, heading, one field, one button. */
export function AuthForm({ title, subtitle, input, buttonLabel, canSubmit, onSubmit }: AuthFormProps) {
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

        <TextInput
          placeholderTextColor={Colors.textMuted}
          keyboardType="number-pad"
          returnKeyType="done"
          onSubmitEditing={canSubmit ? onSubmit : undefined}
          {...input}
          style={[styles.input, input.style]}
        />

        <Pressable
          disabled={!canSubmit}
          onPress={onSubmit}
          style={({ pressed }) => [
            styles.button,
            !canSubmit && styles.buttonDisabled,
            pressed && styles.buttonPressed,
          ]}>
          <ThemedText type="smallBold" themeColor="onInk">
            {buttonLabel}
          </ThemedText>
        </Pressable>
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
  input: {
    marginTop: Spacing.three,
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
