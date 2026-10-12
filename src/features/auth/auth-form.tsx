import { Image } from 'expo-image';
import { useEffect, useRef, type ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useKeyboardVisible } from '@/hooks/use-keyboard-visible';

export type AuthField = TextInputProps & {
  /** Shown above the field, so it stays clear what to type once the placeholder is gone. */
  label: string;
  /** Fixed text before the value, e.g. "+91". */
  prefix?: string;
};

type AuthFormProps = {
  title: string;
  subtitle: string;
  /** Shown between the subtitle and the fields, e.g. the log in / create account switch. */
  beforeFields?: ReactNode;
  /** One text field per entry, top to bottom. Number pad unless a field says otherwise. */
  fields: AuthField[];
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

/**
 * Shared layout for the sign-in steps: logo, heading, fields, one button. It scrolls, and while
 * the keyboard is up it drops the logo and scrolls the fields and button into view above it.
 */
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
  const keyboardVisible = useKeyboardVisible();
  const scroll = useRef<ScrollView>(null);
  const inputs = useRef<(TextInput | null)[]>([]);

  // Keep the field being typed in, and the button under it, above the keyboard.
  useEffect(() => {
    if (!keyboardVisible) return;
    const timer = setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(timer);
  }, [keyboardVisible]);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Android draws edge to edge, so the window no longer shrinks for the keyboard: pad on
          both platforms. */}
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView
          ref={scroll}
          style={styles.flex}
          contentContainerStyle={[styles.container, keyboardVisible && styles.containerTop]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          showsVerticalScrollIndicator={false}>
          {keyboardVisible ? null : (
            <Image
              source={require('@/assets/images/logo-mark.png')}
              style={styles.logo}
              contentFit="contain"
            />
          )}
          <ThemedText type="title">{title}</ThemedText>
          <ThemedText themeColor="textSecondary">{subtitle}</ThemedText>

          {beforeFields ? <View style={styles.beforeFields}>{beforeFields}</View> : null}

          <View style={[styles.fields, beforeFields ? styles.fieldsAfterSlot : null]}>
            {fields.map(({ label, prefix, style, ...field }, index) => {
              const isLast = index === fields.length - 1;
              return (
                <View key={field.nativeID ?? index} style={styles.field}>
                  <ThemedText type="caption" themeColor="textSecondary" style={styles.label}>
                    {label}
                  </ThemedText>
                  <View style={[styles.inputRow, busy && styles.inputBusy]}>
                    {prefix ? (
                      <ThemedText style={styles.prefix} accessibilityElementsHidden>
                        {prefix}
                      </ThemedText>
                    ) : null}
                    <TextInput
                      ref={(input) => {
                        inputs.current[index] = input;
                      }}
                      accessibilityLabel={label}
                      placeholderTextColor={Colors.textMuted}
                      keyboardType="number-pad"
                      returnKeyType={isLast ? 'done' : 'next'}
                      submitBehavior={isLast ? 'blurAndSubmit' : 'submit'}
                      onSubmitEditing={
                        isLast
                          ? enabled
                            ? onSubmit
                            : undefined
                          : () => inputs.current[index + 1]?.focus()
                      }
                      editable={!busy}
                      {...field}
                      style={[styles.input, style]}
                    />
                  </View>
                </View>
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
        </ScrollView>
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
  flex: {
    flex: 1,
    width: '100%',
  },
  container: {
    flexGrow: 1,
    width: '100%',
    maxWidth: MaxContentWidth / 2,
    alignSelf: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.two,
  },
  containerTop: {
    justifyContent: 'flex-start',
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
  inputBusy: {
    opacity: 0.6,
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
