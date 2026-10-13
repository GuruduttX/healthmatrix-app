import { AlertCircle, ArrowRight, Lock, QrCode, Sparkles, Video } from 'lucide-react-native';
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
import { LogoMark } from '@/components/ui/logo-mark';
import { PageBackground } from '@/components/ui/morning-light';
import { TextField } from '@/components/ui/text-field';
import {
  Colors,
  Fonts,
  Gutter,
  MaxContentWidth,
  Radius,
  Shadows,
  Spacing,
} from '@/constants/theme';
import { useKeyboardVisible } from '@/hooks/use-keyboard-visible';

import { OtpField } from './otp-field';

export type AuthField = TextInputProps & {
  /** Shown above the field, so it stays clear what to type once the placeholder is gone. */
  label: string;
  /** Fixed text before the value, e.g. "+91". */
  prefix?: string;
  /** A one-time code: a box per digit (`maxLength` of them) instead of a plain field. */
  otp?: boolean;
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

const LOGO = 64;

/**
 * Shared layout for the sign-in steps, on the warm page: the brand in the morning light, then one
 * white card with the heading, fields and one button. It scrolls, and while the keyboard is up it
 * drops the brand and scrolls the fields and button into view above it.
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
      <PageBackground height={480} />
      {/* Android draws edge to edge, so the window no longer shrinks for the keyboard: pad on
          both platforms. */}
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView
          ref={scroll}
          style={styles.flex}
          contentContainerStyle={[
            styles.container,
            {
              paddingTop: insets.top + (keyboardVisible ? Spacing.three : Spacing.five + 4),
              paddingBottom: insets.bottom + Spacing.three,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          showsVerticalScrollIndicator={false}>
          {/* The brand and the card sit together in the middle of the page; with the keyboard up,
              the card alone sits at the top. */}
          <View style={[styles.main, keyboardVisible && styles.mainTop]}>
            {keyboardVisible ? null : (
              <View style={styles.hero}>
                {/* The shadow sits on its own wrapper, outside the tile's rounded clip. */}
                <View style={styles.logoShadow}>
                  <View style={styles.logoTile}>
                    <LogoMark size={LOGO} scale={0.6} />
                  </View>
                </View>
                <ThemedText style={styles.brand} accessibilityRole="header">
                  HealthMatrix
                </ThemedText>
                <ThemedText style={styles.tagline}>
                  Your health ID, records and doctors, in one card.
                </ThemedText>
                <View style={styles.features}>
                  {FEATURES.map(({ icon: Icon, label }) => (
                    <View key={label} style={styles.feature}>
                      <Icon size={14} color={Colors.primary} strokeWidth={2.4} />
                      <ThemedText style={styles.featureText}>{label}</ThemedText>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.card}>
              <View style={styles.heading}>
                <ThemedText style={styles.title} accessibilityRole="header">
                  {title}
                </ThemedText>
                <ThemedText style={styles.subtitle}>{subtitle}</ThemedText>
              </View>

              {beforeFields}

              <View style={styles.fields}>
                {fields.map(({ label, prefix, otp, ...field }, index) => {
                  const isLast = index === fields.length - 1;
                  const shared = {
                    ref: (input: TextInput | null) => {
                      inputs.current[index] = input;
                    },
                    label,
                    keyboardType: 'number-pad',
                    returnKeyType: isLast ? 'done' : 'next',
                    submitBehavior: isLast ? 'blurAndSubmit' : 'submit',
                    onSubmitEditing: isLast
                      ? enabled
                        ? onSubmit
                        : undefined
                      : () => inputs.current[index + 1]?.focus(),
                    editable: !busy,
                  } as const;
                  return otp ? (
                    <OtpField
                      key={field.nativeID ?? index}
                      {...shared}
                      {...field}
                      value={field.value ?? ''}
                    />
                  ) : (
                    <TextField
                      key={field.nativeID ?? index}
                      {...shared}
                      prefix={prefix}
                      {...field}
                    />
                  );
                })}
              </View>

              {error ? (
                <View style={styles.error} accessibilityLiveRegion="polite">
                  <AlertCircle size={15} color={Colors.high} strokeWidth={2.4} />
                  <ThemedText style={styles.errorText}>{error}</ThemedText>
                </View>
              ) : null}

              <Button
                label={buttonLabel}
                icon={ArrowRight}
                loading={busy}
                disabled={!canSubmit}
                onPress={onSubmit}
              />

              {footer}
            </View>
          </View>

          <View style={styles.trust}>
            <Lock size={13} color={Colors.textFaint} strokeWidth={2.2} />
            <ThemedText style={styles.trustText}>
              Encrypted, and shared only with your consent
            </ThemedText>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/** What membership brings, shown under the brand. */
const FEATURES = [
  { icon: QrCode, label: 'Emergency QR' },
  { icon: Sparkles, label: 'Ekaay AI' },
  { icon: Video, label: 'Video consults' },
];

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.canvas,
  },
  flex: {
    flex: 1,
    width: '100%',
  },
  container: {
    flexGrow: 1,
    width: '100%',
    maxWidth: MaxContentWidth / 2 + Gutter * 2,
    alignSelf: 'center',
    gap: Spacing.four,
    paddingHorizontal: Gutter,
  },
  // A little above the middle, where the eye lands first.
  main: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: Spacing.four + 4,
    paddingBottom: Spacing.five,
  },
  mainTop: {
    justifyContent: 'flex-start',
    paddingBottom: 0,
  },
  hero: {
    alignItems: 'center',
  },
  logoShadow: {
    marginBottom: Spacing.three,
    borderRadius: 20,
    boxShadow: Shadows.dish,
  },
  // A white app-icon tile with the petals in the brand's three oranges.
  logoTile: {
    width: LOGO,
    height: LOGO,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.hairline,
    backgroundColor: Colors.backgroundElement,
  },
  brand: {
    fontFamily: Fonts.display,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.6,
    color: Colors.text,
  },
  tagline: {
    marginTop: 4,
    textAlign: 'center',
    fontFamily: Fonts.medium,
    fontSize: 15,
    lineHeight: 21,
    color: Colors.textSoft,
  },
  // A quiet line of what membership brings: an orange icon and a word each, no boxes.
  features: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    columnGap: Spacing.three,
    rowGap: Spacing.two,
    marginTop: Spacing.three,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  featureText: {
    fontFamily: Fonts.semibold,
    fontSize: 12.5,
    lineHeight: 16,
    color: Colors.text,
  },
  // The one raised thing on the page.
  card: {
    gap: Spacing.three,
    padding: Spacing.four - 4,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.hairline,
    backgroundColor: Colors.backgroundElement,
    boxShadow: Shadows.raised,
  },
  heading: {
    gap: 4,
  },
  title: {
    fontFamily: Fonts.displaySemibold,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.4,
    color: Colors.text,
  },
  subtitle: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSoft,
  },
  fields: {
    gap: Spacing.three,
  },
  error: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: -Spacing.one,
  },
  errorText: {
    flex: 1,
    marginTop: -1,
    fontFamily: Fonts.semibold,
    fontSize: 13.5,
    lineHeight: 18,
    color: Colors.high,
  },
  trust: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  trustText: {
    fontFamily: Fonts.medium,
    fontSize: 12.5,
    lineHeight: 17,
    color: Colors.textFaint,
  },
});
