import { router } from 'expo-router';
import { useState } from 'react';
import { authApi, type AuthIntent } from '@/features/auth/auth-api';
import { AuthForm, type AuthField } from '@/features/auth/auth-form';
import { AuthModeSwitch } from '@/features/auth/auth-mode-switch';

const COPY: Record<AuthIntent, { title: string; subtitle: string }> = {
  login: {
    title: 'Welcome back.',
    subtitle: 'Log in with your mobile number. We will send you a one-time code.',
  },
  signup: {
    title: 'Your whole health, in one card.',
    subtitle: 'Create your account with your name and mobile number.',
  },
};

export default function LoginScreen() {
  const [intent, setIntent] = useState<AuthIntent>('login');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSignup = intent === 'signup';
  const phoneValid = /^[6-9]\d{9}$/.test(phone);
  const canSubmit = phoneValid && (!isSignup || name.trim().length >= 2);

  const changeIntent = (next: AuthIntent) => {
    setIntent(next);
    setError(null);
  };

  const sendOtp = async () => {
    setBusy(true);
    setError(null);
    try {
      const { devCode } = await authApi.sendOtp(
        isSignup ? { intent, phone, name: name.trim() } : { intent: 'login', phone },
      );
      router.push({
        pathname: '/verify-otp',
        params: {
          intent,
          phone,
          ...(isSignup && { name: name.trim() }),
          ...(devCode && { devCode }),
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send the code. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const nameField: AuthField = {
    label: 'Full name',
    nativeID: 'name',
    value: name,
    onChangeText: setName,
    placeholder: 'Your name',
    keyboardType: 'default',
    autoCapitalize: 'words',
    autoComplete: 'name',
    textContentType: 'name',
    maxLength: 60,
  };
  const phoneField: AuthField = {
    label: 'Mobile number',
    prefix: '+91',
    nativeID: 'phone',
    value: phone,
    onChangeText: (text) => setPhone(text.replace(/\D/g, '')),
    placeholder: '10-digit mobile number',
    autoComplete: 'tel',
    textContentType: 'telephoneNumber',
    maxLength: 10,
  };

  return (
    <AuthForm
      title={COPY[intent].title}
      subtitle={COPY[intent].subtitle}
      beforeFields={<AuthModeSwitch value={intent} onChange={changeIntent} disabled={busy} />}
      fields={isSignup ? [nameField, phoneField] : [phoneField]}
      buttonLabel="Send OTP"
      canSubmit={canSubmit}
      onSubmit={sendOtp}
      busy={busy}
      error={error}
    />
  );
}
