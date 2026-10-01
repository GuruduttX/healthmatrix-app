import { router } from 'expo-router';
import { useState } from 'react';

import { AuthForm } from '@/features/auth/auth-form';

export default function LoginScreen() {
  const [phone, setPhone] = useState('');

  return (
    <AuthForm
      title="Your whole health, in one card."
      subtitle="Enter your mobile number to get started."
      input={{
        value: phone,
        onChangeText: (text) => setPhone(text.replace(/\D/g, '')),
        placeholder: '10-digit mobile number',
        maxLength: 10,
      }}
      buttonLabel="Send OTP"
      canSubmit={/^[6-9]\d{9}$/.test(phone)}
      onSubmit={() => router.push({ pathname: '/verify-otp', params: { phone } })}
    />
  );
}
