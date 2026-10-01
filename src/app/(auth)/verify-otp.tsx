import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { useAuth } from '@/features/auth/auth-context';
import { AuthForm } from '@/features/auth/auth-form';

export default function VerifyOtpScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { signIn } = useAuth();
  const [otp, setOtp] = useState('');

  // STUB: the auth API is not built yet, so any 6 digits sign in with a local
  // placeholder token. Replace with POST /auth/otp/verify when auth lands.
  const verify = () => signIn(`dev-${phone}`);

  return (
    <AuthForm
      title="Enter the code"
      subtitle={`Sent to +91 ${phone}`}
      input={{
        value: otp,
        onChangeText: (text) => setOtp(text.replace(/\D/g, '')),
        placeholder: '6-digit OTP',
        maxLength: 6,
        autoFocus: true,
        style: { letterSpacing: 4 },
      }}
      buttonLabel="Verify"
      canSubmit={otp.length === 6}
      onSubmit={verify}
    />
  );
}
