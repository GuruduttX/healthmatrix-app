import { api } from '@/services/api';
import { type Gender, type Member } from '@/types';

export type SendOtpResult = {
  sent: boolean;
  isNewMember: boolean;
  /** Only returned outside production when Twilio is not configured, so no SMS was sent. */
  devCode?: string;
};

export type AuthIntent = 'login' | 'signup';

/** A login sends only the phone; a signup also sends the member's name. */
export type SendOtpRequest =
  | { intent: 'login'; phone: string }
  | { intent: 'signup'; phone: string; name: string };

export type VerifyOtpResult = { token: string; member: Member; isNewMember: boolean };

export type ProfileUpdate = { name?: string; email?: string; gender?: Gender | null };

export const authApi = {
  sendOtp: (request: SendOtpRequest) =>
    api<SendOtpResult>('/auth/otp/send', { method: 'POST', body: request }),
  verifyOtp: (phone: string, code: string) =>
    api<VerifyOtpResult>('/auth/otp/verify', { method: 'POST', body: { phone, code } }),
  me: () => api<{ member: Member }>('/members/me'),
  updateProfile: (update: ProfileUpdate) =>
    api<{ member: Member }>('/members/me', { method: 'PATCH', body: update }),
  /** `base64` is a JPEG; resize it first (see `pickProfilePhoto`). */
  uploadPhoto: (base64: string) =>
    api<{ member: Member }>('/members/me/photo', { method: 'PUT', body: { base64 } }),
  logout: () => api<null>('/auth/logout', { method: 'POST' }),
};
