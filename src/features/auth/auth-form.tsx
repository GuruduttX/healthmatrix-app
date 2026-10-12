import { Image } from 'expo-image';
import { useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowRight, Lock, QrCode, Sparkles, Video } from 'lucide-react-native';
import { useEffect, useRef, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { HeroBackground } from '@/components/ui/hero-background';
import { TextField } from '@/components/ui/text-field';
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
 * Shared layout for the sign-in steps: a dark header with the brand, then a white sheet with the
 * heading, fields and one button. It scrolls, and while the keyboard is up it drops the header
 * and scrolls the fields and button into view above it.
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
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const scroll = useRef<ScrollView>(null);
  const inputs = useRef<(TextInput | null)[]>([]);

  // Keep the field being typed in, and the button under it, above the keyboard.
  useEffect(() => {
    if (!keyboardVisible) return;
    const timer = setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(timer);
  }, [keyboardVisible]);

  return (
    <View style={styles.screen}>
      {/* Light status bar text over the dark header, while it shows. */}
      {focused && !keyboardVisible ? <StatusBar style="light" /> : null}
      {/* Android draws edge to edge, so the window no longer shrinks for the keyboard: pad on
          both platforms. */}
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView
          ref={scroll}
          style={styles.flex}
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          showsVerticalScrollIndicator={false}>
          {keyboardVisible ? (
            <View style={{ height: insets.top + Spacing.three }} />
          ) : (
            <View style={[styles.hero, { paddingTop: insets.top + Spacing.five }]}>
              <HeroBackground />
              <View style={styles.heroInner}>
                <View style={styles.logoTile}>
                  <Image
                    source={require('@/assets/images/logo-mark.png')}
                    style={styles.logo}
                    contentFit="contain"
                  />
                </View>
                <ThemedText style={styles.brand}>HealthMatrix</ThemedText>
                <ThemedText style={styles.tagline}>
                  Your health ID, records and doctors, in one card.
                </ThemedText>
                <View style={styles.pills}>
                  {FEATURES.map(({ icon: Icon, label }) => (
                    <View key={label} style={styles.pill}>
                      <Icon size={13} color={Colors.primaryLight} strokeWidth={2.4} />
                      <ThemedText style={styles.pillText}>{label}</ThemedText>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          <View style={[styles.sheet, keyboardVisible && styles.sheetFlat]}>
            <ThemedText style={styles.title}>{title}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {subtitle}
            </ThemedText>

            {beforeFields ? <View style={styles.beforeFields}>{beforeFields}</View> : null}

            <View style={[styles.fields, beforeFields ? styles.fieldsAfterSlot : null]}>
              {fields.map(({ label, prefix, ...field }, index) => {
                const isLast = index === fields.length - 1;
                return (
                  <TextField
                    key={field.nativeID ?? index}
                    ref={(input) => {
                      inputs.current[index] = input;
                    }}
                    label={label}
                    prefix={prefix}
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
                  />
                );
              })}
            </View>

            {error ? (
              <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite">
                {error}
              </ThemedText>
            ) : null}

            <View style={styles.submit}>
              <Button
                label={buttonLabel}
                icon={ArrowRight}
                loading={busy}
                disabled={!canSubmit}
                onPress={onSubmit}
              />
            </View>

            {footer}

            <View style={styles.trust}>
              <Lock size={12} color={Colors.textMuted} strokeWidth={2.2} />
              <ThemedText type="caption" themeColor="textMuted">
                Encrypted, and shared only with your consent
              </ThemedText>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/** What membership brings, shown on the sign-in header. */
const FEATURES = [
  { icon: QrCode, label: 'Emergency QR' },
  { icon: Sparkles, label: 'Ekaay AI' },
  { icon: Video, label: 'Video consults' },
];

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.backgroundElement,
  },
  flex: {
    flex: 1,
    width: '100%',
  },
  container: {
    flexGrow: 1,
  },
  hero: {
    paddingBottom: Spacing.five + Spacing.three,
    backgroundColor: Colors.backgroundElement,
  },
  heroInner: {
    width: '100%',
    maxWidth: MaxContentWidth / 2,
    alignSelf: 'center',
    alignItems: 'flex-start',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  logoTile: {
    width: 60,
    height: 60,
    marginBottom: Spacing.two,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundElement,
    boxShadow: '0 10px 24px rgba(0, 0, 0, 0.25)',
  },
  logo: {
    width: 38,
    height: 34,
  },
  brand: {
    fontFamily: Fonts.display,
    fontSize: 32,
    lineHeight: 38,
    color: Colors.onInk,
  },
  tagline: {
    fontFamily: Fonts.medium,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.onInkMuted,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    backgroundColor: Colors.glass,
  },
  pillText: {
    fontFamily: Fonts.semibold,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.onInk,
  },
  // The white sheet rides up over the bottom of the header.
  sheet: {
    flexGrow: 1,
    width: '100%',
    maxWidth: MaxContentWidth / 2,
    alignSelf: 'center',
    gap: Spacing.two,
    marginTop: -Spacing.five,
    padding: Spacing.four,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: Colors.backgroundElement,
  },
  sheetFlat: {
    marginTop: 0,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 27,
    lineHeight: 33,
  },
  beforeFields: {
    marginTop: Spacing.three,
  },
  fields: {
    gap: Spacing.three,
    marginTop: Spacing.three,
  },
  fieldsAfterSlot: {
    marginTop: Spacing.two,
  },
  submit: {
    marginTop: Spacing.two,
  },
  trust: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 'auto',
    paddingTop: Spacing.four,
  },
});
