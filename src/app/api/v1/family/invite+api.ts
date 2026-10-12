import { z } from 'zod';

import { hashOtp, OTP_RESEND_MS, OTP_TTL_MS, PHONE_PATTERN, requireMember } from '@/server/auth';
import { FAMILY_RELATIONS } from '@/server/constants';
import { connectDB } from '@/server/db';
import { MAX_FAMILY } from '@/server/family';
import { handle, HttpError } from '@/server/http';
import { FamilyInviteModel, FamilyLinkModel, MemberModel } from '@/server/models';
import { sendOtp } from '@/server/otp';

const body = z
  .object({
    phone: z.string().regex(PHONE_PATTERN, 'Enter a valid 10-digit mobile number'),
    name: z.string({ error: 'Enter their name' }).trim().min(2, 'Enter their name').max(60),
    relation: z.enum(FAMILY_RELATIONS, 'Choose how they are related to you'),
    /** Required for "other": how they're related, in the member's words. */
    relationName: z.string().trim().max(30, 'Keep it under 30 letters').optional(),
  })
  .refine((input) => input.relation !== 'other' || (input.relationName?.length ?? 0) >= 2, {
    message: 'Say how they are related, e.g. Cousin or Friend',
    path: ['relationName'],
  });

/**
 * Step 1 of adding a family member: texts a code to their phone. They read it out to the member,
 * which is their say-so for the member to see their records. See `verify+api.ts` for step 2.
 */
export const POST = handle(async (request: Request) => {
  const { phone, name, relation, relationName } = body.parse(await request.json());
  await connectDB();
  const me = await requireMember(request);

  if (phone === me.phone) throw new HttpError(400, 'That’s your own number. Enter theirs.');

  const existing = await MemberModel.findOne({ phone }).select('name');
  if (existing && (await FamilyLinkModel.exists({ owner: me._id, member: existing._id }))) {
    throw new HttpError(409, `${existing.name} is already in your family.`);
  }
  if ((await FamilyLinkModel.countDocuments({ owner: me._id })) >= MAX_FAMILY) {
    throw new HttpError(400, `You can add up to ${MAX_FAMILY} family members.`);
  }

  const recent = await FamilyInviteModel.findOne({ owner: me._id, phone }).sort({ createdAt: -1 });
  if (recent && Date.now() - recent.createdAt.getTime() < OTP_RESEND_MS) {
    throw new HttpError(429, 'Please wait a few seconds before asking for another code');
  }

  // Send first, so a failed SMS leaves no invite behind to block a retry.
  const delivery = await sendOtp(phone);
  await FamilyInviteModel.deleteMany({ owner: me._id, phone });
  await FamilyInviteModel.create({
    owner: me._id,
    phone,
    name,
    relation,
    relationName: relation === 'other' ? relationName : undefined,
    codeHash: delivery.provider === 'dev' ? await hashOtp(phone, delivery.code) : undefined,
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  });

  return Response.json({
    sent: true,
    /** Whether they already use HealthMatrix; if not, verifying creates their account. */
    hasAccount: !!existing,
    // Only when no SMS provider is set up, which `sendOtp` refuses in production.
    ...(delivery.provider === 'dev' && { devCode: delivery.code }),
  });
});
