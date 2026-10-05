import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { authApi } from '@/features/auth/auth-api';
import { useAuth } from '@/features/auth/auth-context';
import { AuthForm } from '@/features/auth/auth-form';

export default function VerifyOtpScreen() {
  const params = useLocalSearchParams<{ name: string; phone: string; devCode?: string }>();
  const { signIn } = useAuth();
  const [otp, setOtp] = useState('');
  const [devCode, setDevCode] = useState(params.devCode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const verify = async () => {
    setBusy(true);
    setError(null);
    try {
      const { token, member } = await authApi.verifyOtp(params.phone, otp);
      // Signing in swaps the auth stack for the tabs, which open on Home.
      await signIn(token, member);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not check the code. Try again.');
      setBusy(false);
    }
  };

  const resend = async () => {
    setError(null);
    setNotice(null);
    try {
      const result = await authApi.sendOtp(params.name, params.phone);
      setDevCode(result.devCode);
      setOtp('');
      setNotice('A new code is on its way.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send a new code. Try again.');
    }
  };

  return (
    <AuthForm
      title="Enter the code"
      subtitle={`Sent to +91 ${params.phone}`}
      fields={[
        {
          value: otp,
          onChangeText: (text) => setOtp(text.replace(/\D/g, '')),
          placeholder: '6-digit OTP',
          maxLength: 6,
          autoFocus: true,
          autoComplete: 'sms-otp',
          textContentType: 'oneTimeCode',
          style: { letterSpacing: 4 },
        },
      ]}
      buttonLabel="Verify"
      canSubmit={otp.length === 6}
      onSubmit={verify}
      busy={busy}
      error={error}
      footer={
        <>
          {notice ? (
            <ThemedText type="small" themeColor="success">
              {notice}
            </ThemedText>
          ) : null}
          {devCode ? (
            <ThemedText type="caption" themeColor="textMuted">
              Testing only, no SMS is sent yet: your code is {devCode}
            </ThemedText>
          ) : null}
          <Pressable
            onPress={resend}
            disabled={busy}
            accessibilityRole="button"
            hitSlop={8}
            style={styles.resend}>
            <ThemedText type="smallBold" themeColor="primary">
              Resend code
            </ThemedText>
          </Pressable>
        </>
      }
    />
  );
}

const styles = StyleSheet.create({
  resend: {
    alignSelf: 'center',
    marginTop: Spacing.two,
  },
});
