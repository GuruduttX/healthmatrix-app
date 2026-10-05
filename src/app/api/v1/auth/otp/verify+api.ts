import { z } from 'zod';

import {
  createSession,
  generateMemberId,
  hashOtp,
  OTP_MAX_ATTEMPTS,
  PHONE_PATTERN,
  toMemberJson,
} from '@/server/auth';
import { connectDB } from '@/server/db';
import { handle, HttpError } from '@/server/http';
import { MemberModel, OtpChallengeModel } from '@/server/models';

const body = z.object({
  phone: z.string().regex(PHONE_PATTERN, 'Enter a valid 10-digit mobile number'),
  code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'),
});

/** Step 2 of sign-in: check the code, then sign in, creating the account on first sign-in. */
export const POST = handle(async (request: Request) => {
  const { phone, code } = body.parse(await request.json());
  await connectDB();

  const challenge = await OtpChallengeModel.findOne({
    phone,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });
  if (!challenge) throw new HttpError(400, 'This code has expired. Ask for a new one.');

  if (challenge.codeHash !== (await hashOtp(phone, code))) {
    challenge.attempts += 1;
    if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
      await challenge.deleteOne();
      throw new HttpError(400, 'Too many wrong codes. Ask for a new one.');
    }
    await challenge.save();
    throw new HttpError(400, 'That code is not right. Check it and try again.');
  }
  await challenge.deleteOne();

  let member = await MemberModel.findOne({ phone });
  const isNewMember = !member;
  member ??= await MemberModel.create({
    phone,
    name: challenge.name,
    memberId: await generateMemberId(),
  });

  const token = await createSession(member._id);
  return Response.json({ token, member: toMemberJson(member), isNewMember });
});
