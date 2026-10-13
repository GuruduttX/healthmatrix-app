import { useLocalSearchParams } from 'expo-router';
import { CircleCheck } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts } from '@/constants/theme';
import { authApi, type AuthIntent } from '@/features/auth/auth-api';
import { useAuth } from '@/features/auth/auth-context';
import { AuthForm } from '@/features/auth/auth-form';

export default function VerifyOtpScreen() {
  const params = useLocalSearchParams<{
    intent: AuthIntent;
    phone: string;
    name?: string;
    devCode?: string;
  }>();
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
      const result = await authApi.sendOtp(
        params.intent === 'signup'
          ? { intent: 'signup', phone: params.phone, name: params.name ?? '' }
          : { intent: 'login', phone: params.phone },
      );
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
          label: 'One-time code',
          value: otp,
          onChangeText: (text) => setOtp(text.replace(/\D/g, '')),
          placeholder: '6-digit OTP',
          maxLength: 6,
          autoFocus: true,
          autoComplete: 'sms-otp',
          textContentType: 'oneTimeCode',
          otp: true,
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
            <View style={styles.notice} accessibilityLiveRegion="polite">
              <CircleCheck size={15} color={Colors.good} strokeWidth={2.4} />
              <ThemedText style={styles.noticeText}>{notice}</ThemedText>
            </View>
          ) : null}
          {devCode ? (
            <ThemedText style={styles.devCode}>
              Testing only, no SMS was sent: your code is {devCode}
            </ThemedText>
          ) : null}
          <Pressable
            onPress={resend}
            disabled={busy}
            accessibilityRole="button"
            hitSlop={8}
            style={({ pressed }) => [styles.resend, pressed && styles.pressed]}>
            <ThemedText style={styles.resendText}>Resend code</ThemedText>
          </Pressable>
        </>
      }
    />
  );
}

const styles = StyleSheet.create({
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  noticeText: {
    flex: 1,
    fontFamily: Fonts.semibold,
    fontSize: 13.5,
    lineHeight: 18,
    color: Colors.good,
  },
  devCode: {
    fontFamily: Fonts.medium,
    fontSize: 12.5,
    lineHeight: 17,
    color: Colors.textFaint,
  },
  resend: {
    alignSelf: 'center',
  },
  resendText: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    lineHeight: 18,
    color: Colors.primaryDeep,
  },
  pressed: {
    opacity: 0.6,
  },
});
