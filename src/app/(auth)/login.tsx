import { router } from 'expo-router';
import { useState } from 'react';

import { authApi } from '@/features/auth/auth-api';
import { AuthForm } from '@/features/auth/auth-form';

export default function LoginScreen() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = name.trim().length >= 2 && /^[6-9]\d{9}$/.test(phone);

  const sendOtp = async () => {
    setBusy(true);
    setError(null);
    try {
      const { devCode } = await authApi.sendOtp(name.trim(), phone);
      router.push({
        pathname: '/verify-otp',
        params: { name: name.trim(), phone, ...(devCode && { devCode }) },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send the code. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthForm
      title="Your whole health, in one card."
      subtitle="Enter your name and mobile number to sign in or create your account."
      fields={[
        {
          value: name,
          onChangeText: setName,
          placeholder: 'Your name',
          keyboardType: 'default',
          autoCapitalize: 'words',
          autoComplete: 'name',
          textContentType: 'name',
          maxLength: 60,
        },
        {
          value: phone,
          onChangeText: (text) => setPhone(text.replace(/\D/g, '')),
          placeholder: '10-digit mobile number',
          autoComplete: 'tel',
          textContentType: 'telephoneNumber',
          maxLength: 10,
        },
      ]}
      buttonLabel="Send OTP"
      canSubmit={canSubmit}
      onSubmit={sendOtp}
      busy={busy}
      error={error}
    />
  );
}
