import { type Types } from 'mongoose';

import { HttpError } from './http';
import { MemberModel, SessionModel, type Member } from './models';

export const OTP_TTL_MS = 5 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
/** How long before the same phone can ask for another code. */
export const OTP_RESEND_MS = 30 * 1000;
const SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000;

/** Indian mobile number, ten digits starting 6 to 9. */
export const PHONE_PATTERN = /^[6-9]\d{9}$/;

// Web Crypto only, so this runs the same in the dev server and on EAS Hosting.

export async function sha256(text: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function randomDigits(length: number) {
  const bytes = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(bytes, (n) => String(n % 10)).join('');
}

export const generateOtp = () => randomDigits(6);

/** The OTP hash is salted with the phone so the same code on two phones hashes differently. */
export const hashOtp = (phone: string, code: string) => sha256(`${phone}:${code}`);

/** Twelve digits, never starting with 0, shown as "HM 4829 1057 3316". */
export async function generateMemberId() {
  for (;;) {
    const memberId =
      String(1 + (crypto.getRandomValues(new Uint32Array(1))[0]! % 9)) + randomDigits(11);
    if (!(await MemberModel.exists({ memberId }))) return memberId;
  }
}

/** A random URL-safe string with `bytes` bytes of entropy. */
export function randomToken(bytes = 32) {
  const values = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...values))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** Creates a session and returns the raw token. Only its hash is stored. */
export async function createSession(memberId: Types.ObjectId) {
  const token = randomToken();
  await SessionModel.create({
    member: memberId,
    tokenHash: await sha256(token),
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
  });
  return token;
}

function bearerToken(request: Request) {
  const header = request.headers.get('authorization') ?? '';
  return header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : null;
}

/** The session behind the request's bearer token, or a 401. */
export async function requireSession(request: Request) {
  const token = bearerToken(request);
  if (!token) throw new HttpError(401, 'Please sign in');
  const session = await SessionModel.findOne({
    tokenHash: await sha256(token),
    expiresAt: { $gt: new Date() },
  });
  if (!session) throw new HttpError(401, 'Your session has ended. Please sign in again.');
  return session;
}

/** The signed-in member, or a 401. */
export async function requireMember(request: Request) {
  const session = await requireSession(request);
  const member = await MemberModel.findById(session.member);
  if (!member) throw new HttpError(401, 'Please sign in');
  return member;
}

/** The member as the app sees it. Matches `Member` in `src/types/index.ts`. */
export function toMemberJson(member: Member & { _id: unknown }) {
  return {
    id: String(member._id),
    memberId: member.memberId,
    name: member.name,
    phone: member.phone,
    email: member.email ?? undefined,
    gender: member.gender ?? undefined,
    /** Relative to the API base URL. */
    photoUrl: member.photoKey ? `/photos/${member.photoKey}` : undefined,
    bloodGroup: member.bloodGroup ?? undefined,
    plan: member.plan,
    abhaLinked: Boolean(member.abha?.linkedAt),
    memberSince: member.memberSince.toISOString(),
    validThru: member.validThru?.toISOString(),
  };
}
